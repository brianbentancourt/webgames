export function Fogata({
  reloj,
  mostrarDigitos,
  segundos,
}: {
  reloj: number;
  mostrarDigitos: boolean;
  /** Segundos restantes, ya redondeados. Solo se pinta si `mostrarDigitos`. */
  segundos?: number | undefined;
}) {
  // El reloj va de 1 (lleno) a 0 (vacío).
  // La luz (escala y opacidad) baja a medida que se consume.
  const scale = 0.6 + reloj * 0.4;
  const opacity = 0.4 + reloj * 0.6;

  return (
    <div className="fogata-container">
      <div
        className="luz-fogata"
        style={{
          transform: `translate(-50%, -50%) scale(${scale})`,
          opacity
        }}
      />
      <div className="flama-base brasa-anim" />
      <div className="flama-medio brasa-anim" />
      <div className="flama-centro brasa-anim" />
      {mostrarDigitos && segundos !== undefined && segundos > 0 && (
        <div className="fogata-digitos">{segundos}</div>
      )}
    </div>
  );
}
