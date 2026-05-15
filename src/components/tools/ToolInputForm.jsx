import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Zap, RotateCcw } from 'lucide-react';

export default function ToolInputForm({ tool, inputs, onChange, onCalculate, onReset, loading }) {
  const fields = tool?.input_fields || [];

  const handleChange = (name, value) => onChange({ ...inputs, [name]: value });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCalculate();
    }
  };

  if (fields.length === 0) {
    return (
      <div className="flex gap-3">
        <Button onClick={onCalculate} disabled={loading} className="rounded-xl gap-2">
          <Zap className="w-4 h-4" /> Generate
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <Label className="text-sm font-medium mb-1.5 block">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.type === 'textarea' ? (
              <Textarea
                value={inputs[field.name] || ''}
                onChange={e => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder || ''}
                rows={5}
                className="rounded-xl font-mono text-sm resize-y"
              />
            ) : field.type === 'select' ? (
              <Select
                value={String(inputs[field.name] ?? field.default_value ?? '')}
                onValueChange={v => handleChange(field.name, v)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {(field.options || []).map(opt => (
                    <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === 'date' ? (
              <Input
                type="date"
                value={inputs[field.name] || ''}
                onChange={e => handleChange(field.name, e.target.value)}
                onKeyDown={handleKeyDown}
                className="rounded-xl"
              />
            ) : field.type === 'file' ? (
              <div className="space-y-2">
                <Input
                  type="file"
                  accept={field.accept || '*/*'}
                  onChange={e => handleChange(field.name, e.target.files?.[0] || '')}
                  className="rounded-xl"
                />
                {inputs[field.name] && typeof inputs[field.name] !== 'string' && (
                  <p className="text-sm text-muted-foreground">Selected: {inputs[field.name].name}</p>
                )}
              </div>
            ) : (
              <Input
                type={field.type === 'number' ? 'number' : 'text'}
                value={inputs[field.name] || ''}
                onChange={e => handleChange(field.name, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={field.placeholder || ''}
                min={field.min}
                max={field.max}
                className="rounded-xl"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-1">
        <Button onClick={onCalculate} disabled={loading} className="rounded-xl gap-2 px-6">
          <Zap className="w-4 h-4" />
          {loading ? 'Calculating…' : 'Calculate'}
        </Button>
        <Button variant="outline" onClick={onReset} className="rounded-xl gap-2">
          <RotateCcw className="w-4 h-4" /> Reset
        </Button>
      </div>
    </div>
  );
}