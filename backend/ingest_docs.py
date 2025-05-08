# backend/ingest_docs.py
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings  # Or HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS  # Or Chroma
import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

# Create this folder and put your PDFs there
PDF_DIRECTORY = "./data-pdfs"
VECTOR_STORE_PATH = "vectorstore/db_faiss"  # Or "vectorstore/db_chroma"
# Ensure Ollama is running this model
OLLAMA_MODEL_NAME = os.getenv("OLLAMA_MODEL_NAME", "llama3.2")


def ingest_documents():
    # 1. Load PDF Documents
    print(f"Loading documents from {PDF_DIRECTORY}...")
    # Use DirectoryLoader if you have multiple PDFs in a folder
    loader = DirectoryLoader(
        PDF_DIRECTORY, glob="*.pdf", loader_cls=PyPDFLoader)
    documents = loader.load()
    if not documents:
        print("No documents found. Exiting.")
        return

    print(f"Loaded {len(documents)} documents.")

    # 2. Split Documents into Chunks
    print("Splitting documents into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=200)
    texts = text_splitter.split_documents(documents)
    print(f"Split into {len(texts)} chunks.")

    # 3. Create Embeddings
    print(
        f"Creating embeddings using Ollama model: {OLLAMA_MODEL_NAME}...")
    # Ensure your Ollama server is running and the model is pulled (e.g., ollama pull llama3)
    embeddings = OllamaEmbeddings(model=OLLAMA_MODEL_NAME)
    # Example with Sentence Transformers (if not using Ollama for embeddings):
    # from langchain.embeddings import HuggingFaceEmbeddings
    # embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 4. Initialize and Populate Vector Store
    print(f"Initializing vector store at {VECTOR_STORE_PATH}...")
    # For FAISS:
    db = FAISS.from_documents(texts, embeddings)
    db.save_local(VECTOR_STORE_PATH)
    # For Chroma:
    # db = Chroma.from_documents(texts, embeddings, persist_directory=VECTOR_STORE_PATH)
    # db.persist()
    print("Vector store created and populated successfully.")


if __name__ == "__main__":
    ingest_documents()
