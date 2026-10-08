import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Brush } from 'recharts';
import { compact, number, time, timestamp } from '../format';

function ReadingTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const reading = payload[0].payload;
  return <div className="chart-tooltip"><strong>{number(reading.players)} players</strong><span>{timestamp(reading.time)}</span></div>;
}

// every chart point is a saved reading. A new install starts with one.
export default function PlayerChart({ game, large = false }) {
  const [range, setRange] = useState('all');
  const readings = game.history || [];
  const latest = readings.at(-1)?.time || 0;
  const cutoff = range === '1h' ? latest - 3600 : range === '24h' ? latest - 86400 : 0;
  const points = readings.filter(reading => reading.time >= cutoff);
  return <section className="player-chart" aria-label={`${game.title} player history`}>
    <div className="chart-heading"><h3>Player count</h3><div className="range-buttons" aria-label="Chart time range">
      {[['1h', '1h'], ['24h', '24h'], ['all', 'All']].map(([value, label]) =>
        <button key={value} className={range === value ? 'active' : ''} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}
    </div></div>
    <div className="chart-frame" style={{ height: large ? 260 : 210 }}>
      {points.length ? <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 15, right: 12, left: -16, bottom: 0 }} accessibilityLayer>
          <defs><linearGradient id={`fill-${game.appID}-${large}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e63858" stopOpacity={0.24}/><stop offset="100%" stopColor="#e63858" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid stroke="#2b2c37" vertical={false}/>
          <XAxis dataKey="time" tickFormatter={time} tick={{ fill: '#aaabbc', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={42}/>
          <YAxis tickFormatter={compact} tick={{ fill: '#aaabbc', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={64}/>
          <Tooltip content={<ReadingTooltip/>} cursor={{ stroke: '#aaabbc', strokeDasharray: '3 3' }}/>
          <Area type="linear" dataKey="players" name="Players" stroke="#e63858" strokeWidth={2} fill={`url(#fill-${game.appID}-${large})`} dot={points.length === 1 ? { r: 4, fill: '#e63858' } : false} activeDot={{ r: 5 }} isAnimationActive={false}/>
          {large && points.length > 3 && <Brush dataKey="time" height={24} stroke="#5e4050" fill="#17181f" tickFormatter={time}/>} 
        </AreaChart>
      </ResponsiveContainer> : <p className="empty-chart">No readings in this range.</p>}
    </div>
    <p className="chart-note">{points.length === 1 ? 'First history sample saved.' : `${number(points.length)} readings · Hover or tap for details.`} History is sampled every {Math.round((game.historySaveSeconds || 900) / 60)} minutes; player counts refresh independently.</p>
  </section>;
}
