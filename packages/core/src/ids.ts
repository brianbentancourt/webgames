/**
 * Identificadores con marca de tipo. Son strings en runtime, pero el compilador
 * no deja pasar un JugadorId donde va un TramoId.
 */

declare const marca: unique symbol;

type Marcado<T extends string> = string & { readonly [marca]: T };

export type SalaId = Marcado<'SalaId'>;
export type PartidaId = Marcado<'PartidaId'>;
export type JugadorId = Marcado<'JugadorId'>;
export type TableroId = Marcado<'TableroId'>;
export type TramoId = Marcado<'TramoId'>;
export type ObjetoId = Marcado<'ObjetoId'>;
export type ObjetivoId = Marcado<'ObjetivoId'>;

export const salaId = (v: string) => v as SalaId;
export const partidaId = (v: string) => v as PartidaId;
export const jugadorId = (v: string) => v as JugadorId;
export const tableroId = (v: string) => v as TableroId;
export const tramoId = (v: string) => v as TramoId;
export const objetoId = (v: string) => v as ObjetoId;
export const objetivoId = (v: string) => v as ObjetivoId;
