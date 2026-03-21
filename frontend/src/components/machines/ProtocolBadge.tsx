import { cn } from "@/lib/utils";

interface ProtocolBadgeProps {
  protocol: 'OPC-UA' | 'MQTT' | 'Modbus' | 'REST' | 'CSV';
  className?: string;
}

export function ProtocolBadge({ protocol, className }: ProtocolBadgeProps) {
  const getColors = () => {
    switch (protocol) {
      case 'OPC-UA': return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case 'MQTT': return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case 'Modbus': return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case 'REST': return "bg-green-500/10 text-green-400 border-green-500/20";
      case 'CSV': return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <span className={cn("px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider uppercase font-mono shadow-sm", getColors(), className)}>
      {protocol}
    </span>
  );
}
