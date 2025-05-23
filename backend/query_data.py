import argparse
import json
from langchain.vectorstores.chroma import Chroma
from langchain.prompts import ChatPromptTemplate
from langchain_community.llms.ollama import Ollama

from get_embedding_function import get_embedding_function
from populate_database import VECTOR_STORE_PATH

PROMPT_TEMPLATE = """
Answer the question based only on the following context:

{context}

---

Answer the question based on the above context: {question}
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query_text", type=str, help="The query text.")
    args = parser.parse_args()
    query_text = args.query_text
    query_rag(query_text)


def query_rag(query_text: str):
    embedding_function = get_embedding_function()
    db = Chroma(persist_directory=VECTOR_STORE_PATH,
                embedding_function=embedding_function)

    results = db.similarity_search_with_score(query_text, k=5)

    context_text = "\n\n---\n\n".join(
        [doc.page_content for doc, _score in results])
    prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    prompt = prompt_template.format(context=context_text, question=query_text)

    model = Ollama(model="llama3.2")
    response_text = model.invoke(prompt)

    sources = [
        {
            "source": doc.metadata.get("id", None),
            "content_preview": doc.page_content[:200] + "..."
        }
        for doc, _score in results
    ]
    formatted_response = f"Response: {response_text}\nSources: {sources}"
    print(formatted_response)
    return {"answer": response_text, "sources": sources}


def query_rag_stream(query_text: str):
    embedding_function = get_embedding_function()
    db = Chroma(persist_directory=VECTOR_STORE_PATH,
                embedding_function=embedding_function)

    results = db.similarity_search_with_score(query_text, k=5)

    context_text = "\n\n---\n\n".join(
        [doc.page_content for doc, _score in results])
    prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    prompt = prompt_template.format(context=context_text, question=query_text)

    model = Ollama(model="llama3.2", temperature=0.3, num_ctx=2048)

    sources = [
        {
            "source": doc.metadata.get("id", None),
            "content_preview": doc.page_content[:200] + "..."
        }
        for doc, _score in results
    ]

    yield json.dumps({"type": "sources", "data": sources}) + "\n"

    full_response_text = ""
    for chunk in model.stream(prompt):
        full_response_text += chunk
        yield json.dumps({"type": "chunk", "data": chunk}) + "\n"

    yield json.dumps({"type": "done", "data": full_response_text}) + "\n"


if __name__ == "__main__":
    main()
