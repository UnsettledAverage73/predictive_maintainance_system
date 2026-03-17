import sys
import os

# Add src to python path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from src.agent.maintenance_agent import MaintenanceAgent

def main():
    data_path = "data/sample_maintenance_data.json"
    if not os.path.exists(data_path):
        print("Data file not found. Please generate it first.")
        return

    agent = MaintenanceAgent(data_path)

    print("--- Maintenance AI Agent ---")
    print("1. Summarize Equipment Status")
    print("2. Analyze Failure Patterns (with RAG)")
    print("3. Generate Prioritized Maintenance Schedule")
    print("4. Query Specific Equipment History (Exact)")
    print("5. Search Similar Historical Issues (Semantic)")
    print("6. Sync Local Data to Vector DB (Pinecone)")
    print("7. Exit")

    while True:
        choice = input("\nEnter your choice (1-7): ")

        if choice == "1":
            print("\n" + agent.summarize_all_equipment())
        elif choice == "2":
            print("\n" + agent.analyze_patterns())
        elif choice == "3":
            print("\n" + agent.generate_prioritized_schedule())
        elif choice == "4":
            eq_id = input("Enter equipment ID: ")
            history = agent.get_equipment_history(eq_id)
            print(f"\nHistory for {eq_id}:")
            print(f"Logs: {len(history['logs'])}")
            print(f"Notes: {len(history['notes'])}")
            print(f"Incidents: {len(history['incidents'])}")
            for log in history['logs']:
                print(f"  [{log['timestamp']}] {log['activity_type']}: {log['notes']}")
        elif choice == "5":
            query = input("Enter your search query: ")
            print("\n" + agent.query_similar_issues(query))
        elif choice == "6":
            print("\nSyncing data to Pinecone...")
            print(agent.sync_to_vector_db())
        elif choice == "7":
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
