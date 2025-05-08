import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatResponse {
  answer: string;
  sources: { source: string; content_preview: string }[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  readonly #apiUrl = 'http://localhost:8000/api/chat';
  readonly #http = inject(HttpClient);

  sendMessage(query: string): Observable<ChatResponse> {
    return this.#http.post<ChatResponse>(this.#apiUrl, { query });
  }
}
