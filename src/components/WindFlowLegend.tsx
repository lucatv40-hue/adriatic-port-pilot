/** Same speed stops as the canvas; values are knots, not a safety judgment. */
export function WindFlowLegend() {
  return (
    <div className="wind-flow-legend" role="img" aria-label="Intensità vento: azzurro e verde debole, giallo e arancione moderato, rosso e viola forte; scala da 0 a 50 nodi">
      <div className="wind-flow-ramp" />
      <div className="wind-flow-ticks"><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50 kn</span></div>
    </div>
  );
}