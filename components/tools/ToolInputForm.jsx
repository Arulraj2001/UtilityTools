import React from 'react'
import {
  Input
} from '@/components/ui/input'

import {
  Textarea
} from '@/components/ui/textarea'

import {
  Label
} from '@/components/ui/label'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { Button } from '@/components/ui/button'
import { Zap, RotateCcw, FormInput } from 'lucide-react'

export default function ToolInputForm({
  tool,
  inputs,
  onChange,
  onCalculate,
  onReset,
  loading,
}) {
  const fields = tool?.input_fields || []

  const handleChange = (name, value) =>
    onChange({ ...inputs, [name]: value })

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onCalculate()
    }
  }

  /* ================= EMPTY STATE ================= */
  if (fields.length === 0) {
    return (
      <div className="flex gap-3">
        <Button
          onClick={onCalculate}
          disabled={loading}
          className="rounded-2xl gap-2"
        >
          <Zap className="w-4 h-4" />
          Generate
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur">

        <div className="flex items-start justify-between gap-4">

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Input Form
            </p>

            <h3 className="mt-1 text-lg font-semibold">
              Configure Parameters
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Fill required values to generate results
            </p>
          </div>

          <div className="rounded-2xl bg-primary/10 px-3 py-1 text-xs text-primary">
            {fields.length} Fields
          </div>
        </div>
      </div>

      {/* FIELDS */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

        {fields.map((field) => (
          <div
            key={field.name}
            className={field.type === 'textarea'
              ? 'sm:col-span-2'
              : ''
            }
          >

            <Label className="mb-2 block text-sm font-medium">
              {field.label}
              {field.required && (
                <span className="ml-1 text-red-500">
                  *
                </span>
              )}
            </Label>

            {/* TEXTAREA */}
            {field.type === 'textarea' && (
              <Textarea
                value={inputs[field.name] || ''}
                onChange={(e) =>
                  handleChange(
                    field.name,
                    e.target.value
                  )
                }
                placeholder={field.placeholder || ''}
                rows={5}
                className="
                  rounded-2xl
                  font-mono
                  text-sm
                  resize-y
                  border-border/60
                  focus:border-primary/40
                "
              />
            )}

            {/* SELECT */}
            {field.type === 'select' && (
              <Select
                value={String(
                  inputs[field.name] ??
                    field.default_value ??
                    ''
                )}
                onValueChange={(v) =>
                  handleChange(field.name, v)
                }
              >
                <SelectTrigger className="rounded-2xl border-border/60">
                  <SelectValue placeholder="Select option..." />
                </SelectTrigger>

                <SelectContent>
                  {(field.options || []).map(
                    (opt) => (
                      <SelectItem
                        key={opt}
                        value={String(opt)}
                      >
                        {opt}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            )}

            {/* DATE */}
            {field.type === 'date' && (
              <Input
                type="date"
                value={inputs[field.name] || ''}
                onChange={(e) =>
                  handleChange(
                    field.name,
                    e.target.value
                  )
                }
                onKeyDown={handleKeyDown}
                className="rounded-2xl border-border/60"
              />
            )}

            {/* FILE */}
            {field.type === 'file' && (
              <div className="space-y-2">

                <Input
                  type="file"
                  accept={field.accept || '*/*'}
                  onChange={(e) =>
                    handleChange(
                      field.name,
                      e.target.files?.[0] || ''
                    )
                  }
                  className="rounded-2xl border-border/60"
                />

                {inputs[field.name] &&
                  typeof inputs[field.name] !==
                    'string' && (
                    <p className="text-xs text-muted-foreground">
                      Selected:{' '}
                      {inputs[field.name].name}
                    </p>
                  )}
              </div>
            )}

            {/* DEFAULT INPUT */}
            {![
              'textarea',
              'select',
              'date',
              'file',
            ].includes(field.type) && (
              <Input
                type={
                  field.type === 'number'
                    ? 'number'
                    : 'text'
                }
                value={inputs[field.name] || ''}
                onChange={(e) =>
                  handleChange(
                    field.name,
                    e.target.value
                  )
                }
                onKeyDown={handleKeyDown}
                placeholder={field.placeholder || ''}
                min={field.min}
                max={field.max}
                className="
                  rounded-2xl
                  border-border/60
                  focus:border-primary/40
                "
              />
            )}
          </div>
        ))}
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

        <Button
          onClick={onCalculate}
          disabled={loading}
          className="
            rounded-2xl
            gap-2
            px-6
            shadow-md
            shadow-primary/20
          "
        >
          <Zap className="w-4 h-4" />

          {loading
            ? 'Calculating...'
            : 'Run Analysis'}
        </Button>

        <Button
          variant="outline"
          onClick={onReset}
          className="rounded-2xl gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>
    </div>
  )
}