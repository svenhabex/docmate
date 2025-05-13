import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Source {
  source: string;
  content_preview: string;
}

export interface StreamedSources {
  type: 'sources';
  data: Source[];
}

export interface StreamedChunk {
  type: 'chunk';
  data: string;
}

export interface StreamedDone {
  type: 'done';
  data: string;
}

export interface StreamedError {
  type: 'error';
  error: any;
}

export type StreamedChatResponsePart =
  | StreamedSources
  | StreamedChunk
  | StreamedDone
  | StreamedError;

@Injectable({ providedIn: 'root' })
export class ChatService {
  readonly #apiUrl = 'http://localhost:8000/api/chat_stream';

  sendMessage(query: string): Observable<StreamedChatResponsePart> {
    return new Observable<StreamedChatResponsePart>((observer) => {
      const fetchStream = async () => {
        try {
          const response = await fetch(this.#apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
          });

          if (!response.ok) {
            observer.error({
              type: 'error',
              error: `HTTP error! status: ${response.status}`,
            });
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            observer.error({
              type: 'error',
              error: 'Failed to get reader from response body',
            });
            return;
          }

          const decoder = new TextDecoder();

          // Read data from the stream
          // Each "chunk" from the reader might not be a complete JSON object if the server sends them newline-delimited.
          // We need to buffer and process line by line.
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Process any remaining data in the buffer when the stream is done
              if (buffer.trim().length > 0) {
                try {
                  const jsonResponse = JSON.parse(buffer.trim());
                  observer.next(jsonResponse as StreamedChatResponsePart);
                } catch (e) {
                  console.error(
                    'Error parsing remaining JSON:',
                    e,
                    'Buffer:',
                    buffer
                  );
                  observer.next({
                    type: 'error',
                    error: 'Error parsing final JSON from stream',
                  });
                }
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
              const line = buffer.substring(0, newlineIndex).trim();
              buffer = buffer.substring(newlineIndex + 1);
              if (line.length > 0) {
                try {
                  const jsonResponse = JSON.parse(line);
                  observer.next(jsonResponse as StreamedChatResponsePart);
                } catch (e) {
                  console.error('Error parsing JSON line:', e, 'Line:', line);
                }
              }
            }
          }
          observer.complete();
        } catch (error) {
          console.error('Error in fetchStream:', error);
          observer.error({ type: 'error', error });
        }
      };

      fetchStream();

      return () => console.log('Stream observable unsubscribed');
    });
  }
}
