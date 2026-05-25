/**
 * Parcel Dimension Intelligence - Interactive dimension editor with shape detection and recommendations
 */
import React, { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Ruler, Box, Lightbulb, Target, Download, Copy } from 'lucide-react'
import { useParcelIntelligence } from '@/hooks/logistics/useLogisticsCalculations'
import { useExportTools } from '@/hooks/logistics/useExportTools'
import { MetricCard, AnimatedGauge, CardSkeleton } from '../PremiumCharts'
import { toast } from 'sonner'

const ParcelDimensionIntelligence = memo(() => {
  const [inputs, setInputs] = useState({})
  const result = useParcelIntelligence(inputs)
  const { exportJSON, copyResult } = useExportTools('parcel-dimension')

  const handleChange = useCallback((name, value) => {
    setInputs(prev => ({ ...prev, [name]: value }))
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['length', 'width', 'height'].map(f => (
          <div key={f} className="space-y-1">
            <label className="text-[10px] text-muted-foreground">{f.charAt(0).toUpperCase() + f.slice(1)} (cm)</label>
            <input type="number" step="0.1" value={inputs[f] || ''} onChange={e => handleChange(f, e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" />
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Unit</label>
          <select value={inputs.unit || 'cm'} onChange={e => handleChange('unit', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none">
            <option value="cm">CM</option>
            <option value="m">Meters</option>
            <option value="in">Inches</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Target Volume (m³)</label>
          <input type="number" step="0.01" value={inputs.targetVolume || ''} onChange={e => handleChange('targetVolume', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" /></div>
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Target Weight (kg)</label>
          <input type="number" step="0.1" value={inputs.targetWeight || ''} onChange={e => handleChange('targetWeight', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" /></div>
        <div className="space-y-1"><label className="text-[10px] text-muted-foreground">Divisor</label>
          <input type="number" value={inputs.divisor || 5000} onChange={e => handleChange('divisor', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none" /></div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Shape Type" value={result.shapeType || 'N/A'} icon={Box} prefix="" color="text-blue-400" />
            {result.volume && <MetricCard label="Volume (CBM)" value={result.volume.cbm} icon={Ruler} prefix="" color="text-green-400" />}
            {result.volume && <MetricCard label="Volume (cm³)" value={result.volume.cm3} icon={Ruler} prefix="" color="text-purple-400" />}
            {result.volumetricWeight && <MetricCard label="Vol. Weight" value={`${result.volumetricWeight} kg`} icon={Target} prefix="" color="text-orange-400" />}
          </div>

          {result.missingDim && (
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 rounded-xl p-4">
              <p className="text-sm font-medium">Estimated Missing Dimension: <span className="text-primary">{result.missingDim.name}: {result.missingDim.value} {inputs.unit || 'cm'}</span></p>
            </div>
          )}

          {result.girth && (
            <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <p className="text-sm">Girth: <span className="font-bold">{result.girth} cm</span></p>
            </div>
          )}

          {result.recommendations?.length > 0 && (
            <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> Recommendations
              </h4>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Visual dimension preview */}
          {inputs.length && inputs.width && inputs.height && (
            <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Dimension Preview</h4>
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-36 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-primary/20 flex items-center justify-center"
                  style={{
                    perspective: '500px',
                    transform: 'rotateX(10deg) rotateY(-15deg)',
                    transformStyle: 'preserve-3d',
                  }}>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">{inputs.length}cm</div>
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-xs text-muted-foreground -rotate-90">{inputs.width}cm</div>
                  <div className="absolute bottom-0 right-2 text-xs text-muted-foreground">{inputs.height}cm</div>
                  <Box className="w-8 h-8 text-primary/40" />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
            <button onClick={() => { copyResult(JSON.stringify(result)); toast.success('Copied!') }} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Copy className="w-3 h-3" /> Copy</button>
            <button onClick={() => exportJSON(result)} className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 flex items-center gap-1.5"><Download className="w-3 h-3" /> JSON</button>
          </div>
        </>
      )}

      {!result && !inputs.length && !inputs.width && !inputs.height && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Ruler className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Enter dimensions to analyze parcel
        </div>
      )}
    </motion.div>
  )
})

export default ParcelDimensionIntelligence