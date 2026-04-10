'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  CheckCircle2,
  Clock,
  Users,
  UserCheck,
  RotateCcw,
  ChevronDown,
  Database,
  PartyPopper,
  AlertCircle,
} from 'lucide-react';

interface Guest {
  id: string;
  nombre: string;
  invitados: number;
  categoria: string;
  notas: string | null;
  activo: boolean;
  arrived: boolean;
  arrivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalPersonas: number;
  totalArrived: number;
  totalPending: number;
  percentage: number;
  totalInvitados: number;
  categories: {
    name: string;
    total: number;
    arrived: number;
    pending: number;
    percentage: number;
  }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Familia Hdez': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  'Fam. Estrada': 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  'DIF': 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  'Maestros': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  'P': 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  'Palomita': 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200',
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}

export default function Home() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<string[]>([]);

  const fetchGuests = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoriaFilter && categoriaFilter !== 'all') params.set('categoria', categoriaFilter);
      if (statusFilter !== 'all') params.set('arrived', statusFilter === 'arrived' ? 'true' : 'false');

      const res = await fetch(`/api/guests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGuests(data.guests);
      }
    } catch {
      toast.error('Error al cargar invitados');
    }
  }, [search, categoriaFilter, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        // Extract categories for filter
        const cats = data.categories.map((c: { name: string }) => c.name).sort();
        setCategories(cats);
        // Open all categories by default
        const open: Record<string, boolean> = {};
        cats.forEach((c: string) => { open[c] = true; });
        setOpenCategories(open);
      }
    } catch {
      toast.error('Error al cargar estadísticas');
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchGuests(), fetchStats()]);
    setLoading(false);
  }, [fetchGuests, fetchStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Base de datos actualizada: ${data.stats.created} nuevos, ${data.stats.updated} actualizados`);
        await loadData();
      } else {
        toast.error('Error al cargar datos');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSeeding(false);
    }
  };

  const handleCheckIn = async (guest: Guest) => {
    // Optimistic update
    const newArrived = !guest.arrived;
    const newArrivedAt = newArrived ? new Date().toISOString() : null;

    setGuests((prev) =>
      prev.map((g) =>
        g.id === guest.id
          ? { ...g, arrived: newArrived, arrivedAt: newArrivedAt }
          : g
      )
    );

    // Update stats optimistically
    if (stats) {
      const personasDelta = guest.invitados + 1;
      setStats({
        ...stats,
        totalArrived: newArrived
          ? stats.totalArrived + personasDelta
          : stats.totalArrived - personasDelta,
        totalPending: newArrived
          ? stats.totalPending - personasDelta
          : stats.totalPending + personasDelta,
        percentage: (() => {
          const total = stats.totalPersonas;
          const arrived = newArrived
            ? stats.totalArrived + personasDelta
            : stats.totalArrived - personasDelta;
          return total > 0 ? Math.round((arrived / total) * 100) : 0;
        })(),
      });
    }

    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: guest.id }),
      });
      if (!res.ok) {
        // Revert on error
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guest.id
              ? { ...g, arrived: guest.arrived, arrivedAt: guest.arrivedAt }
              : g
          )
        );
        await loadData();
        toast.error('Error al registrar llegada');
      } else {
        const personaText = guest.invitados + 1 === 1 ? 'persona' : 'personas';
        if (newArrived) {
          toast.success(`✅ ${guest.nombre} - ${guest.invitados + 1} ${personaText} registrada${guest.invitados + 1 > 1 ? 's' : ''}`);
        } else {
          toast.info(`↩️ ${guest.nombre} - llegada cancelada`);
        }
      }
    } catch {
      await loadData();
      toast.error('Error de conexión');
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/api/guests', { method: 'PATCH' });
      if (res.ok) {
        toast.success('Todas las llegadas han sido reiniciadas');
        await loadData();
      }
    } catch {
      toast.error('Error al reiniciar llegadas');
    }
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Group guests by category
  const groupedGuests: Record<string, Guest[]> = {};
  const filteredGuests = guests.filter((g) => g.activo);

  for (const guest of filteredGuests) {
    const cat = guest.categoria || 'Sin Categoría';
    if (!groupedGuests[cat]) groupedGuests[cat] = [];
    groupedGuests[cat].push(guest);
  }

  const sortedCategories = Object.keys(groupedGuests).sort();

  // Compute per-category arrived count
  const getCategoryArrived = (cat: string, guestsList: Guest[]): { arrived: number; totalPersonas: number } => {
    const arrived = guestsList.filter((g) => g.arrived).length;
    const totalPersonas = guestsList.reduce((s, g) => s + g.invitados + 1, 0);
    return { arrived, totalPersonas };
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-rose-50">
        <div className="text-center space-y-4">
          <PartyPopper className="h-12 w-12 mx-auto text-amber-500 animate-bounce" />
          <p className="text-lg text-muted-foreground">Cargando...</p>
          <Button onClick={handleSeed} disabled={seeding} variant="outline">
            <Database className="h-4 w-4 mr-2" />
            {seeding ? 'Cargando datos...' : 'Cargar datos CSV'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-white to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-rose-500 bg-clip-text text-transparent">
                🎉 Control de Invitados
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Registro de llegadas en tiempo real
              </p>
            </div>
            <Button
              onClick={handleSeed}
              disabled={seeding}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <Database className="h-4 w-4 mr-2" />
              {seeding ? 'Actualizando...' : 'Actualizar Datos'}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-2 border-sky-200 dark:border-sky-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-5 w-5 text-sky-500" />
                  <span className="text-xs font-medium text-muted-foreground">Total Personas</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-sky-700 dark:text-sky-300">
                  {stats.totalPersonas}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground">Llegaron</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                  {stats.totalArrived}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span className="text-xs font-medium text-muted-foreground">Pendientes</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-300">
                  {stats.totalPending}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-rose-200 dark:border-rose-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-rose-500" />
                  <span className="text-xs font-medium text-muted-foreground">% Llegados</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-300">
                  {stats.percentage}%
                </p>
                <Progress
                  value={stats.percentage}
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Filter Bar */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={categoriaFilter}
                onValueChange={setCategoriaFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="arrived">Llegaron</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reiniciar Llegadas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Guest List */}
        <div className="space-y-4">
          {sortedCategories.length === 0 && !loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No se encontraron invitados</p>
                <Button
                  onClick={handleSeed}
                  className="mt-4"
                  variant="outline"
                  size="sm"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Cargar datos CSV
                </Button>
              </CardContent>
            </Card>
          )}

          {sortedCategories.map((cat) => {
            const catGuests = groupedGuests[cat];
            const { arrived: catArrivedCount, totalPersonas: catTotalPersonas } = getCategoryArrived(cat, catGuests);
            const isOpen = openCategories[cat] !== false;

            return (
              <Collapsible
                key={cat}
                open={isOpen}
                onOpenChange={() => toggleCategory(cat)}
              >
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className={getCategoryColor(cat)}>
                          {cat}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {catArrivedCount}/{catGuests.length} llegados · {catTotalPersonas} personas
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <Separator />
                    <div className="p-3 sm:p-4 space-y-2">
                      {catGuests.map((guest) => (
                        <div
                          key={guest.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                            guest.arrived
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                              : 'bg-white dark:bg-gray-900 border-border hover:border-amber-300 dark:hover:border-amber-700'
                          }`}
                        >
                          {/* Check-in Button */}
                          <Button
                            onClick={() => handleCheckIn(guest)}
                            className={`shrink-0 h-12 w-12 rounded-full p-0 transition-all duration-200 ${
                              guest.arrived
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-300'
                            }`}
                            aria-label={
                              guest.arrived
                                ? `Cancelar llegada de ${guest.nombre}`
                                : `Registrar llegada de ${guest.nombre}`
                            }
                          >
                            {guest.arrived ? (
                              <CheckCircle2 className="h-6 w-6" />
                            ) : (
                              <Clock className="h-6 w-6" />
                            )}
                          </Button>

                          {/* Guest Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-semibold text-base ${
                                  guest.arrived
                                    ? 'text-emerald-800 dark:text-emerald-200'
                                    : 'text-foreground'
                                }`}
                              >
                                {guest.nombre}
                              </span>
                              <Badge
                                variant={guest.arrived ? 'default' : 'secondary'}
                                className={
                                  guest.arrived
                                    ? 'bg-emerald-600 text-white text-xs'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs'
                                }
                              >
                                {guest.invitados + 1} persona{guest.invitados + 1 !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            {guest.arrived && guest.arrivedAt && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                Llegó a las {formatTime(guest.arrivedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-md mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {stats && (
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                📊 {stats.totalArrived} de {stats.totalPersonas} personas han llegado{' '}
                <span className="text-amber-600 dark:text-amber-400 font-bold">({stats.percentage}%)</span>
              </p>
              <Progress value={stats.percentage} className="h-3 max-w-md mx-auto" />
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground mt-2">
            Control de Invitados · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
