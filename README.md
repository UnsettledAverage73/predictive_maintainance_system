# Predictive Maintenance AI Agent

This project implements a Generative AI Agent for Predictive Maintenance Scheduling in Manufacturing.

## Features
- **Data Collection:** Supports maintenance logs, operational notes, and incident reports.
- **AI Agent:** Analyzes equipment history to identify failure patterns.
- **Scheduling:** Generates prioritized maintenance schedules based on incident frequency and operational notes.
- **Querying:** Allows users to query the history and status of specific equipment.

## Directory Structure
- `src/data/`: Data schema and synthetic data generation.
- `src/agent/`: Core AI agent logic.
- `src/cli/`: Command-line interface for interaction.
- `data/`: Stores maintenance data (JSON format).
- `tests/`: Unit tests for the agent.

## How to Run
1. **Generate Synthetic Data:**
   ```bash
   python3 src/data/generate_synthetic_data.py
   ```
2. **Run the AI Agent CLI:**
   ```bash
   python3 src/cli/main.py
   ```
3. **Run Tests:**
   ```bash
   python3 tests/test_agent.py
   ```

## Future Enhancements
- Integration with real LLM APIs (OpenAI, Gemini) for deeper textual analysis.
- Vector database integration for efficient RAG-based querying of large log histories.
- Web-based dashboard for visualization.
