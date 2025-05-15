import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';

export type MessageSender = 'user' | 'assistant';

export type Source = { source: string; content_preview: string };

export type StreamedSources = { type: 'sources'; data: Source[] };
export type StreamedChunk = { type: 'chunk'; data: string };
export type StreamedDone = { type: 'done'; data: string };
export type StreamedError = { type: 'error'; error: string };

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
      this.fetchStream(query, observer);

      return () => console.log('Stream observable unsubscribed');
    });
  }

  private async fetchStream(
    query: string,
    observer: Observer<StreamedChatResponsePart>
  ) {
    try {
      const reader = await this.getStreamReader(query, observer);
      if (!reader) {
        return;
      }
      await this.processStream(reader, observer, new TextDecoder());
      observer.complete();
    } catch (error) {
      console.error('Error in fetchStream:', error);
      observer.error({ type: 'error', error });
    }
  }

  private async getStreamReader(
    query: string,
    observer: Observer<StreamedChatResponsePart>
  ): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
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
      observer.complete();

      return null;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      observer.error({
        type: 'error',
        error: 'Failed to get reader from response body',
      });
      observer.complete();

      return null;
    }

    return reader;
  }

  private async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    observer: Observer<StreamedChatResponsePart>,
    decoder: TextDecoder
  ) {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        this.processFinalBuffer(buffer, observer);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = this.processBufferLines(buffer, observer);
    }
  }

  private processBufferLines(
    buffer: string,
    observer: Observer<StreamedChatResponsePart>
  ): string {
    let newlineIndex;
    let currentBuffer = buffer;
    while ((newlineIndex = currentBuffer.indexOf('\n')) >= 0) {
      const line = currentBuffer.substring(0, newlineIndex).trim();
      currentBuffer = currentBuffer.substring(newlineIndex + 1);
      if (line.length > 0) {
        this.parseAndEmitLine(line, observer);
      }
    }
    return currentBuffer;
  }

  private parseAndEmitLine(
    line: string,
    observer: Observer<StreamedChatResponsePart>
  ) {
    try {
      const jsonResponse = JSON.parse(line);
      observer.next(jsonResponse as StreamedChatResponsePart);
    } catch (e) {
      console.error('Error parsing JSON line:', e, 'Line:', line);
    }
  }

  private processFinalBuffer(
    buffer: string,
    observer: Observer<StreamedChatResponsePart>
  ) {
    const trimmedBuffer = buffer.trim();
    if (trimmedBuffer.length > 0) {
      try {
        const jsonResponse = JSON.parse(trimmedBuffer);
        observer.next(jsonResponse as StreamedChatResponsePart);
      } catch (e) {
        console.error(
          'Error parsing remaining JSON:',
          e,
          'Buffer:',
          trimmedBuffer
        );
        observer.next({
          type: 'error',
          error: 'Error parsing final JSON from stream',
        });
      }
    }
  }
}
