# docmate

Local documentation LLM with RAG

## Get started

1. Install local llm [Ollama](https://ollama.com/)
2. Run command `ollama run llama3.2`

## ingest data

1. Add pdf files in `backand/data-pdfs` folder
2. Make sure your virtual environment is activated (`source venv/bin/activate` or `venv\Scripts\activate` on Windows).
3. run command `python ingest_docs.py`
