import { useCallback, useRef } from 'react'

function stableStringify(obj) {
  if (obj === null || obj === undefined) return String(obj)
  if (typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`
  return `{${Object.keys(obj).sort().map(key => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`
}

export default function useToolMemo(runTool) {
  const cacheRef = useRef(new Map())

  return useCallback(async (tool, inputs) => {
    if (!tool) return null
    const key = `${tool.slug}|${stableStringify(inputs)}`
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key)
    }

    const result = await runTool(tool, inputs)
    cacheRef.current.set(key, result)
    return result
  }, [runTool])
}
