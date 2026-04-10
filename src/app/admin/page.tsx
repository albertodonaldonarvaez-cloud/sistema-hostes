'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  RotateCcw,
  Database,
  Shield,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Trash2,
} from 'lucide-react';

interface Stats {
  totalPersonas: number;
  totalArrived: number;
  totalInvitados: number;
  categories: { name: string; total: number; arrived: number }[];
}

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpload, setLastUpload] = useState<{ file: string; size: string; created: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Solo se aceptan archivos .xlsx o .xls');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setLastUpload({ file: data.file, size: data.size, created: data.stats.created, total: data.stats.total });
        toast.success(`✅ ${data.stats.created} invitados cargados (${data.stats.skipped} omitidos)`);
        await fetchStats();
      } else {
        toast.error(data.error || 'Error al cargar archivo');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`🔄 ${data.message}`);
        await fetchStats();
      } else {
        toast.error(data.error || 'Error al reiniciar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al registro
          </a>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">Admin</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-3">
            <Shield className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
          <p className="text-sm text-gray-500">Sube la base de datos o reinicia llegadas</p>
        </div>

        {/* Upload Card */}
        <Card className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Upload className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm">Cargar Base de Datos</h2>
                <p className="text-xs text-gray-500">Sube el archivo Excel con los invitados</p>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                dragOver
                  ? 'border-blue-400 bg-blue-500/5'
                  : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
              }`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx,.xls';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleUpload(file);
                };
                input.click();
              }}
            >
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="h-8 w-8 text-blue-400 mx-auto animate-spin" />
                  <p className="text-sm text-gray-400">Procesando archivo...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <FileSpreadsheet className="h-8 w-8 text-gray-600 mx-auto" />
                  <div>
                    <p className="text-sm text-gray-400">
                      Arrastra tu archivo <span className="text-white font-medium">.xlsx</span> aquí
                    </p>
                    <p className="text-xs text-gray-600 mt-1">o toca para seleccionar</p>
                  </div>
                </div>
              )}
            </div>

            {/* Last upload result */}
            {lastUpload && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-emerald-400 font-medium">
                    {lastUpload.created} invitados cargados
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {lastUpload.file} · {lastUpload.size}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reset Card */}
        <Card className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <RotateCcw className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm">Reiniciar Llegadas</h2>
                <p className="text-xs text-gray-500">Pone todas las llegadas en cero</p>
              </div>
            </div>

            <Button
              onClick={handleReset}
              disabled={resetting}
              variant="outline"
              className="w-full rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 h-12 text-sm font-medium transition-all"
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {resetting ? 'Reiniciando...' : 'Reiniciar Todas las Llegadas'}
            </Button>

            <p className="text-[11px] text-gray-600 text-center">
              Esto no borra los invitados, solo quita las llegadas registradas
            </p>
          </CardContent>
        </Card>

        {/* Current Stats */}
        <Card className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-500/10 border border-gray-500/20">
                  <Database className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white text-sm">Estado Actual</h2>
                  <p className="text-xs text-gray-500">Resumen de la base de datos</p>
                </div>
              </div>
              <Button
                onClick={fetchStats}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-white text-xs"
              >
                Actualizar
              </Button>
            </div>

            {stats ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-800">
                  <p className="text-2xl font-bold text-white">{stats.totalInvitados}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Grupos</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-800">
                  <p className="text-2xl font-bold text-white">{stats.totalPersonas}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Personas</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-2xl font-bold text-emerald-400">{stats.totalArrived}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Llegaron</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-2xl font-bold text-amber-400">{stats.totalPersonas - stats.totalArrived}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Pendientes</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">Toca &quot;Actualizar&quot; para ver el estado</p>
              </div>
            )}

            {/* Categories */}
            {stats && stats.categories.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Categorías</p>
                <div className="space-y-1.5">
                  {stats.categories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-gray-400">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400">{cat.arrived}</span>
                        <span className="text-xs text-gray-600">/</span>
                        <span className="text-xs text-gray-400">{cat.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <p className="text-center text-[11px] text-gray-700 pt-4">
          Acceso restringido · URL: /admin
        </p>
      </div>
    </div>
  );
}
