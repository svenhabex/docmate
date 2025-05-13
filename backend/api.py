from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from query_data import query_rag, query_rag_stream
import json

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


class ChatQuery(BaseModel):
    query: str


@app.post("/api/chat")
async def chat_with_llm(chat_query: ChatQuery):
    print(f"Received query: {chat_query.query}")
    try:
        result = query_rag(chat_query.query)
        answer = result.get("answer", "No answer found.")
        sources = result.get("sources", [])
        print(f"LLM Answer: {answer}")
        return {"answer": answer, "sources": sources}
    except Exception as e:
        print(f"Error during LLM query: {e}")
        return {"answer": f"Error processing your query: {str(e)}", "sources": []}


@app.post("/api/chat_stream")
async def chat_with_llm_stream(chat_query: ChatQuery):
    print(f"Received streaming query: {chat_query.query}")
    try:
        return StreamingResponse(query_rag_stream(chat_query.query), media_type="application/x-ndjson")
    except Exception as e:
        print(f"Error during streaming LLM query: {e}")

        async def error_generator():
            yield json.dumps({"type": "error", "error": f"Error starting stream: {str(e)}"}) + "\n"
        return StreamingResponse(error_generator(), media_type="application/x-ndjson", status_code=500)


@app.get("/")
async def root():
    return {"message": "Backend is running!"}

# To run: uvicorn main:app --reload --port 8000
