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
    print("2. Analyze Failure Patterns")
    print("3. Generate Prioritized Maintenance Schedule")
    print("4. Query Specific Equipment History")
    print("5. Exit")

    while True:
        choice = input("\nEnter your choice (1-5): ")

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
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
