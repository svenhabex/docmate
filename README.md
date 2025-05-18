# docmate

Local documentation LLM with RAG

## Get started

1. Install local llm [Ollama](https://ollama.com/)
2. Install a model you can find all the available models here [Ollama](https://ollama.com/search)
3. Run Ollama with command `ollama serve`

## prepare data

1. Add pdf files in `backend/data` folder
2. Make sure your virtual environment is activated (`source .venv/bin/activate`).
3. run command `python populate_database.py`

## run application
1. navigate to the backend folder and start the api with command `uvicorn api:app --reload --port 8000`
2. navigate to the frontend folder and start the application with command `npm start`
