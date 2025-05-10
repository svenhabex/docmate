from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

origins = ["http://localhost:4200"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VECTOR_STORE_PATH = "vectorstore/db_faiss"
OLLAMA_MODEL_NAME = os.getenv("OLLAMA_MODEL_NAME", "llama3")

print("Loading embeddings model and vector store...")
embeddings = OllamaEmbeddings(model=OLLAMA_MODEL_NAME)

# Load the vector store
# For FAISS
# Add allow_dangerous_deserialization for FAISS
db = FAISS.load_local(VECTOR_STORE_PATH, embeddings,
                      allow_dangerous_deserialization=True)
# For Chroma
# db = Chroma(persist_directory=VECTOR_STORE_PATH, embedding_function=embeddings)

# Retrieve top 3 relevant chunks
retriever = db.as_retriever(search_kwargs={"k": 3})

print(f"Initializing ChatOllama with model: {OLLAMA_MODEL_NAME}...")
llm = ChatOllama(model=OLLAMA_MODEL_NAME, temperature=0.3)

# Define a prompt template
prompt_template = """Use the following pieces of context to answer the question at the end.
   If you don't know the answer, just say that you don't know, don't try to make up an answer.
   Keep the answer concise.

   Context: {context}

   Question: {question}

   Helpful Answer:"""
QA_CHAIN_PROMPT = PromptTemplate.from_template(prompt_template)

# Create the RetrievalQA chain
qa_chain = RetrievalQA.from_chain_type(
    llm,
    retriever=retriever,
    chain_type_kwargs={"prompt": QA_CHAIN_PROMPT},
    return_source_documents=True  # Optionally return source documents
)
print("Langchain QA chain initialized.")
# --- End Langchain Setup ---


class ChatQuery(BaseModel):
    query: str


@app.post("/api/chat")
async def chat_with_llm(chat_query: ChatQuery):
    print(f"Received query: {chat_query.query}")
    try:
        result = qa_chain.invoke({"query": chat_query.query})
        # result will be a dictionary, typically with an 'answer' key and 'source_documents'
        # For older Langchain versions, it might be just `result = qa_chain({"query": chat_query.query})` and access `result['result']`
        answer = result.get("result", "No answer found.")
        source_docs = result.get("source_documents", [])

        sources = []
        if source_docs:
            sources = [{"source": doc.metadata.get(
                "source", "Unknown source"), "content_preview": doc.page_content[:200] + "..."} for doc in source_docs]

        print(f"LLM Answer: {answer}")
        return {"answer": answer, "sources": sources}
    except Exception as e:
        print(f"Error during LLM query: {e}")
        return {"answer": f"Error processing your query: {str(e)}", "sources": []}


@app.get("/")
async def root():
    return {"message": "Backend is running!"}

# To run: uvicorn main:app --reload --port 8000
