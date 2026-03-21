import asyncio
import httpx
import socket
import boto3
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
import json
from pydantic import BaseModel
from typing import List, Dict, Optional
import os

router = APIRouter(prefix="/api/cloud")

class DiscoveryResult(BaseModel):
    host: str
    port: int
    url: str
    available: bool
    version: Optional[str] = None
    models: List[str] = []

class ProvisionRequest(BaseModel):
    aws_access_key: str
    aws_secret_key: str
    aws_session_token: Optional[str] = None
    region: str = "us-east-1"
    instance_type: str = "t3.small"
    storage_gb: int = 20

class InstanceActionRequest(BaseModel):
    aws_access_key: str
    aws_secret_key: str
    aws_session_token: Optional[str] = None
    region: str = "us-east-1"
    instance_id: str

class UpdateStorageRequest(BaseModel):
    aws_access_key: str
    aws_secret_key: str
    aws_session_token: Optional[str] = None
    region: str = "us-east-1"
    instance_id: str
    new_storage_gb: int

@router.post("/provision")
async def provision_cloud_instance(request: ProvisionRequest):
    return {"message": "Please use the websocket endpoint /api/cloud/ws/provision for live logs."}

@router.post("/terminate")
async def terminate_cloud_instance(request: InstanceActionRequest):
    try:
        ec2 = boto3.client(
            'ec2',
            aws_access_key_id=request.aws_access_key,
            aws_secret_access_key=request.aws_secret_key,
            aws_session_token=request.aws_session_token,
            region_name=request.region
        )
        ec2.terminate_instances(InstanceIds=[request.instance_id])
        return {"status": "success", "message": f"Termination signal sent to {request.instance_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/list-instances")
async def list_cloud_instances(request: ProvisionRequest):
    try:
        ec2 = boto3.client(
            'ec2',
            aws_access_key_id=request.aws_access_key,
            aws_secret_access_key=request.aws_secret_key,
            aws_session_token=request.aws_session_token,
            region_name=request.region
        )
        response = ec2.describe_instances(
            Filters=[{'Name': 'tag:Name', 'Values': ['Sovereign-AI-Node']}]
        )
        
        instances = []
        for res in response.get('Reservations', []):
            for inst in res.get('Instances', []):
                instances.append({
                    "instance_id": inst['InstanceId'],
                    "state": inst['State']['Name'],
                    "public_ip": inst.get('PublicIpAddress'),
                    "type": inst['InstanceType'],
                    "launch_time": inst['LaunchTime'].isoformat()
                })
        
        return {"instances": instances}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

OPTIMIZED_USER_DATA = """#!/bin/bash
# 1. Install Ollama efficiently
curl -fsSL https://ollama.ai/install.sh | sh
mkdir -p /etc/systemd/system/ollama.service.d
echo "[Service]" > /etc/systemd/system/ollama.service.d/environment.conf
echo "Environment=\\"OLLAMA_HOST=0.0.0.0\\"" >> /etc/systemd/system/ollama.service.d/environment.conf
systemctl daemon-reload
systemctl enable ollama
systemctl restart ollama

# 2. Parallel model pulling
sleep 15
(ollama pull qwen2.5:0.5b &)
(ollama pull nomic-embed-text &)
wait
"""

@router.websocket("/ws/provision")
async def provision_instance_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        provider = data.get("provider", "aws")
        storage_gb = data.get("storage_gb", 30)

        async def send_log(message, status="info"):
            await websocket.send_json({"type": "log", "message": message, "status": status})

        if provider == "aws":
            access_key = data.get("aws_access_key")
            secret_key = data.get("aws_secret_key")
            session_token = data.get("aws_session_token")
            region = data.get("region", "us-east-1")
            instance_type = data.get("instance_type", "t3.small")

            if not access_key or not secret_key:
                await websocket.send_json({"type": "error", "message": "Missing AWS credentials"})
                await websocket.close()
                return

            await send_log(f"🔐 Initializing AWS Client in {region}...")
            loop = asyncio.get_event_loop()
            
            def get_ec2_client():
                return boto3.client(
                    'ec2',
                    aws_access_key_id=access_key,
                    aws_secret_access_key=secret_key,
                    aws_session_token=session_token,
                    region_name=region
                )

            ec2 = await loop.run_in_executor(None, get_ec2_client)

            # 1. Security Group
            await send_log("🛡️ Configuring Security Group (sovereign-ai-sg)...")
            sg_name = 'sovereign-ai-sg'
            try:
                sgs = await loop.run_in_executor(None, lambda: ec2.describe_security_groups(GroupNames=[sg_name]))
                sg_id = sgs['SecurityGroups'][0]['GroupId']
                await send_log(f"✅ Found existing security group: {sg_id}")
            except:
                await send_log("Creating new security group...")
                sg_res = await loop.run_in_executor(None, lambda: ec2.create_security_group(
                    GroupName=sg_name,
                    Description='Security group for Sovereign AI instance'
                ))
                sg_id = sg_res['GroupId']
                await loop.run_in_executor(None, lambda: ec2.authorize_security_group_ingress(
                    GroupId=sg_id,
                    IpPermissions=[
                        {'IpProtocol': 'tcp', 'FromPort': 22, 'ToPort': 22, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},
                        {'IpProtocol': 'tcp', 'FromPort': 11434, 'ToPort': 11434, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]}
                    ]
                ))
                await send_log(f"✅ Created security group: {sg_id}")

            # 2. Latest AMI
            await send_log("🔍 Finding latest Ubuntu 22.04 AMI...")
            def get_ami():
                images = ec2.describe_images(
                    Owners=['099720109477'],
                    Filters=[
                        {'Name': 'name', 'Values': ['ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*']},
                        {'Name': 'architecture', 'Values': ['x86_64']},
                    ]
                )
                return sorted(images['Images'], key=lambda x: x['CreationDate'], reverse=True)[0]['ImageId']
            
            ami_id = await loop.run_in_executor(None, get_ami)
            await send_log(f"✅ Using AMI: {ami_id}")

            # 3. Launch
            await send_log(f"🚀 Launching {instance_type} instance in {region} with {storage_gb}GB storage...")
            def launch_instance():
                return ec2.run_instances(
                    ImageId=ami_id,
                    InstanceType=instance_type,
                    MinCount=1,
                    MaxCount=1,
                    SecurityGroupIds=[sg_id],
                    UserData=OPTIMIZED_USER_DATA,
                    BlockDeviceMappings=[
                        {
                            'DeviceName': '/dev/sda1',
                            'Ebs': {
                                'VolumeSize': storage_gb,
                                'VolumeType': 'gp3',
                                'DeleteOnTermination': True
                            }
                        }
                    ],
                    TagSpecifications=[{'ResourceType': 'instance', 'Tags': [{'Key': 'Name', 'Value': 'Sovereign-AI-Node'}]}]
                )
            
            launch_res = await loop.run_in_executor(None, launch_instance)
            instance_id = launch_res['Instances'][0]['InstanceId']
            await send_log(f"✅ Instance ID: {instance_id}")

            # 4. Wait for IP
            await send_log("⏳ Waiting for instance to start and public IP assignment...")
            def wait_for_ip():
                waiter = ec2.get_waiter('instance_running')
                waiter.wait(InstanceIds=[instance_id])
                info = ec2.describe_instances(InstanceIds=[instance_id])
                return info['Reservations'][0]['Instances'][0].get('PublicIpAddress')

            public_ip = await loop.run_in_executor(None, wait_for_ip)
            
            if public_ip:
                await send_log(f"✅ Public IP Assigned: {public_ip}")
                await send_log("⏳ Finalizing AI services and model installation (2-4 mins)...")
                
                all_ready = False
                max_retries = 40 
                required_models = ["qwen2.5:0.5b", "nomic-embed-text"]
                
                for i in range(max_retries):
                    await send_log(f"🔍 Checking service status (Attempt {i+1}/{max_retries})...")
                    try:
                        async with httpx.AsyncClient(timeout=3.0) as client:
                            response = await client.get(f"http://{public_ip}:11434/api/tags")
                            if response.status_code == 200:
                                res_data = response.json()
                                installed = [m['name'] for m in res_data.get('models', [])]
                                missing = [r for r in required_models if not any(r in inst for inst in installed)]
                                
                                if not missing:
                                    all_ready = True
                                    await send_log("✨ All models pulled and service is warm!")
                                    break
                                else:
                                    await send_log(f"Models still pulling: {', '.join(missing)}")
                    except:
                        pass
                    await asyncio.sleep(10)
                
                await websocket.send_json({
                    "type": "complete",
                    "instance_id": instance_id,
                    "public_ip": public_ip,
                    "url": f"http://{public_ip}:11434"
                })
            else:
                await websocket.send_json({"type": "error", "message": "Failed to retrieve public IP"})

        elif provider == "gcp":
            await send_log("⚠️ GCP Native Provisioning is currently in Private Beta.", "error")
            await websocket.send_json({"type": "error", "message": "GCP provisioning requires the google-cloud-compute SDK."})
            
        elif provider == "azure":
            await send_log("⚠️ Azure Native Provisioning is currently in Private Beta.", "error")
            await websocket.send_json({"type": "error", "message": "Azure provisioning requires the azure-mgmt-compute SDK."})
            
        else:
            await websocket.send_json({"type": "error", "message": f"Unknown provider: {provider}"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass

@router.get("/discover")
async def discover_ollama_instances():
    """Scans the local network for Ollama instances."""
    ips = get_local_ip_range()
    if not ips:
        return {"results": []}
    
    semaphore = asyncio.Semaphore(20)
    
    async def limited_check(ip):
        async with semaphore:
            return await check_ollama(ip, 11434)
            
    tasks = [limited_check(ip) for ip in ips]
    results = await asyncio.gather(*tasks)
    
    filtered_results = [r for r in results if r is not None]
    return {"results": filtered_results}

async def check_ollama(ip: str, port: int) -> Optional[DiscoveryResult]:
    url = f"http://{ip}:{port}"
    try:
        async with httpx.AsyncClient(timeout=0.5) as client:
            response = await client.get(f"{url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m["name"] for m in data.get("models", [])]
                return DiscoveryResult(host=ip, port=port, url=url, available=True, models=models)
    except:
        pass
    return None

def get_local_ip_range():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0)
        s.connect(('10.254.254.254', 1))
        local_ip = s.getsockname()[0]
        s.close()
        prefix = ".".join(local_ip.split(".")[:-1])
        return [f"{prefix}.{i}" for i in range(1, 255)]
    except:
        return []
