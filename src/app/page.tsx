'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  Check,
  Users,
  Clock,
  ChevronDown,
  RotateCcw,
  Heart,
  Sparkles,
  Database,
  PartyPopper,
  AlertCircle,
  UserCheck,
  Plus,
  Minus,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Guest {
  id: string;
  nombre: string;
  invitados: number;
  categoria: string;
  notas: string | null;
  activo: boolean;
  arrived: boolean;
  arrivedCount: number;
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
  'Familia Hdez': 'bg-rose-light text-rose-deep border border-rose-soft/40',
  'Fam. Estrada': 'bg-champagne-light text-champagne-dark border border-champagne/30',
  'DIF': 'bg-sage-light text-sage-dark border border-sage/30',
  'Maestros': 'bg-[#fce8e8] text-[#b85c64] border border-[#e8b4b8]/40',
  'P': 'bg-[#fff8e8] text-[#b8922f] border border-[#d4a853]/30',
  'Palomita': 'bg-[#f0e8f8] text-[#7a5d8e] border border-[#c4a8d8]/30',
  'Policía': 'bg-[#e8f0f8] text-[#4a6d8e] border border-[#8eb4d8]/30',
  'Familia y Amigos': 'bg-[#f5e6e0] text-[#8e6b62] border border-[#d4a8a0]/30',
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] || 'bg-[#f5e6e0] text-[#8e6b62] border border-[#d4a8a0]/30';
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
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [checkInGuest, setCheckInGuest] = useState<Guest | null>(null);
  const [checkInCount, setCheckInCount] = useState(0);

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
        const cats = data.categories.map((c: { name: string }) => c.name).sort();
        setCategories(cats);
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
        toast.success(`✨ Datos cargados: ${data.stats.created} invitados registrados`);
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

  const openCheckIn = (guest: Guest) => {
    // Always open dialog — prefill with current arrivedCount if already arrived, or invitados if new
    setCheckInGuest(guest);
    setCheckInCount(guest.arrived ? guest.arrivedCount : guest.invitados);
  };

  const confirmCheckIn = async (guest: Guest, count: number) => {
    setCheckInGuest(null);

    const newArrived = count > 0;
    const newArrivedAt = newArrived ? new Date().toISOString() : null;
    const oldCount = guest.arrived ? guest.arrivedCount : 0;

    // Trigger animation
    if (newArrived && !guest.arrived) {
      setAnimatingId(guest.id);
      setTimeout(() => setAnimatingId(null), 600);
    }

    // Optimistic update
    setGuests((prev) =>
      prev.map((g) =>
        g.id === guest.id
          ? { ...g, arrived: newArrived, arrivedCount: count, arrivedAt: newArrivedAt }
          : g
      )
    );

    if (stats) {
      const delta = count - oldCount;
      setStats({
        ...stats,
        totalArrived: stats.totalArrived + delta,
        totalPending: stats.totalPending - delta,
        percentage: (() => {
          const total = stats.totalPersonas;
          const arrived = stats.totalArrived + delta;
          return total > 0 ? Math.round((arrived / total) * 100) : 0;
        })(),
      });
    }

    try {
      const res = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: guest.id, count }),
      });
      if (!res.ok) {
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guest.id
              ? { ...g, arrived: guest.arrived, arrivedCount: guest.arrivedCount, arrivedAt: guest.arrivedAt }
              : g
          )
        );
        await loadData();
        toast.error('Error al registrar llegada');
      } else {
        if (newArrived) {
          const personaText = count === 1 ? 'persona' : 'personas';
          toast.success(`💍 ${guest.nombre} — ${count} ${personaText} registrada${count > 1 ? 's' : ''}`);
        } else {
          toast.info(`↩️ ${guest.nombre} — llegada cancelada`);
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
  for (const guest of guests) {
    const cat = guest.categoria || 'Familia y Amigos';
    if (!groupedGuests[cat]) groupedGuests[cat] = [];
    groupedGuests[cat].push(guest);
  }

  const sortedCategories = Object.keys(groupedGuests).sort();

  const getCategoryArrived = (cat: string, guestsList: Guest[]): { arrived: number; totalPersonas: number } => {
    const arrived = guestsList.filter((g) => g.arrived).length;
    const totalPersonas = guestsList.reduce((s, g) => s + g.invitados, 0);
    return { arrived, totalPersonas };
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  // Loading state
  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center space-y-6 fade-in-up">
          <div className="relative">
            <div className="text-6xl mb-4 animate-bounce">💍</div>
            <Sparkles className="absolute -top-2 -right-4 h-5 w-5 text-champagne animate-pulse" />
          </div>
          <h2 className="text-2xl font-elegant text-rose-deep">Nuestra Boda</h2>
          <p className="text-warm-gray">Preparando todo para el gran día...</p>
          <Button
            onClick={handleSeed}
            disabled={seeding}
            className="mt-4 bg-gradient-to-r from-rose-soft to-champagne text-white hover:from-rose-mid hover:to-champagne-dark transition-all duration-300 rounded-full px-8 shadow-lg"
          >
            <Database className="h-4 w-4 mr-2" />
            {seeding ? 'Cargando invitados...' : 'Cargar Lista de Invitados'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      {/* ===== HEADER ===== */}
      <header className="wedding-header-bg border-b border-rose-light">
        <div className="max-w-4xl mx-auto px-4 py-5 sm:py-6">
          <div className="text-center space-y-2">
            {/* Decorative top */}
            <div className="flex items-center justify-center gap-2 text-champagne text-sm">
              <span>✦</span>
              <span>✦</span>
              <span>✦</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-elegant text-rose-deep">
              Nuestra Boda
            </h1>

            {/* Floral divider */}
            <div className="floral-divider max-w-xs mx-auto">
              <Heart className="h-4 w-4 text-rose-soft shrink-0" />
            </div>

            <p className="text-sm sm:text-base text-warm-gray tracking-wide">
              Registro de Invitados
            </p>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={handleSeed}
                disabled={seeding}
                size="sm"
                className="bg-gradient-to-r from-champagne-light to-champagne text-charcoal hover:from-champagne hover:to-champagne-dark hover:text-white rounded-full px-5 transition-all duration-300 text-xs font-medium shadow-sm"
              >
                <Database className="h-3.5 w-3.5 mr-1.5" />
                {seeding ? 'Actualizando...' : 'Actualizar Datos'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* ===== STATS DASHBOARD ===== */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 fade-in-up stagger-children">
            {/* Total Personas */}
            <Card className="wedding-card rounded-2xl border border-rose-soft/30 bg-white shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-rose-light">
                    <Users className="h-4 w-4 text-rose-deep" />
                  </div>
                  <span className="text-xs font-medium text-warm-gray">Total Invitados</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-charcoal">
                  {stats.totalPersonas}
                </p>
                <p className="text-xs text-warm-gray mt-1">{stats.totalInvitados} grupos</p>
              </CardContent>
            </Card>

            {/* Llegaron */}
            <Card className="wedding-card rounded-2xl border border-sage/30 bg-white shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-sage-light">
                    <UserCheck className="h-4 w-4 text-sage-dark" />
                  </div>
                  <span className="text-xs font-medium text-warm-gray">Han Llegado</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-sage-dark">
                  {stats.totalArrived}
                </p>
                <p className="text-xs text-warm-gray mt-1">personas presentes</p>
              </CardContent>
            </Card>

            {/* Pendientes */}
            <Card className="wedding-card rounded-2xl border border-champagne/30 bg-white shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-champagne-light">
                    <Clock className="h-4 w-4 text-champagne-dark" />
                  </div>
                  <span className="text-xs font-medium text-warm-gray">Pendientes</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-champagne-dark">
                  {stats.totalPending}
                </p>
                <p className="text-xs text-warm-gray mt-1">por llegar</p>
              </CardContent>
            </Card>

            {/* Progreso */}
            <Card className="wedding-card rounded-2xl border border-rose-soft/30 bg-white shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-rose-light">
                    <Sparkles className="h-4 w-4 text-rose-deep" />
                  </div>
                  <span className="text-xs font-medium text-warm-gray">Progreso</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-rose-deep">
                  {stats.percentage}%
                </p>
                <div className="mt-2 wedding-progress h-2.5">
                  <div
                    className="wedding-progress-bar h-full"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== SEARCH & FILTERS ===== */}
        <Card className="rounded-2xl border border-rose-soft/20 bg-white/80 backdrop-blur-sm shadow-sm fade-in-up">
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
              <Input
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 rounded-xl border-rose-light/60 bg-ivory/50 focus:border-champagne focus:ring-champagne/20 text-charcoal placeholder:text-warm-gray/70"
              />
            </div>

            {/* Category pills */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-warm-gray uppercase tracking-wider">Categoría</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoriaFilter('all')}
                  className={`pill-btn px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    categoriaFilter === 'all'
                      ? 'pill-btn-active border-transparent'
                      : 'border-rose-soft/40 text-warm-gray hover:border-rose-soft hover:text-rose-deep bg-white'
                  }`}
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaFilter(categoriaFilter === cat ? 'all' : cat)}
                    className={`pill-btn px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      categoriaFilter === cat
                        ? 'pill-btn-active border-transparent'
                        : 'border-rose-soft/40 text-warm-gray hover:border-rose-soft hover:text-rose-deep bg-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Status pills + Reset */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'Todos', icon: Users },
                  { key: 'arrived', label: 'Llegaron', icon: Check },
                  { key: 'pending', label: 'Pendientes', icon: Clock },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`pill-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      statusFilter === key
                        ? 'pill-btn-active border-transparent'
                        : 'border-rose-soft/40 text-warm-gray hover:border-rose-soft hover:text-rose-deep bg-white'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-warm-gray hover:text-rose-deep hover:bg-rose-light rounded-full text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reiniciar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ===== GUEST LIST ===== */}
        <div className="space-y-4 fade-in-up">
          {sortedCategories.length === 0 && !loading && (
            <Card className="rounded-2xl border border-rose-soft/20 bg-white/80 shadow-sm">
              <CardContent className="p-8 text-center space-y-4">
                <div className="text-5xl mb-2">💍</div>
                <p className="text-warm-gray font-medium">No se encontraron invitados</p>
                <p className="text-xs text-warm-gray/70">Carga la lista de invitados para comenzar</p>
                <Button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="mt-2 bg-gradient-to-r from-rose-soft to-champagne text-white hover:from-rose-mid hover:to-champagne-dark rounded-full px-6 transition-all duration-300 shadow-md"
                >
                  <Database className="h-4 w-4 mr-2" />
                  {seeding ? 'Cargando...' : 'Cargar Lista'}
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
                <Card className="wedding-card rounded-2xl border border-rose-soft/20 bg-white/90 shadow-sm overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 sm:p-5 hover:bg-rose-light/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getCategoryColor(cat)}`}
                        >
                          {cat}
                        </Badge>
                        <span className="text-sm text-warm-gray hidden sm:inline">
                          {catArrivedCount}/{catGuests.length} llegados · {catTotalPersonas} personas
                        </span>
                        <span className="text-sm text-warm-gray sm:hidden">
                          {catArrivedCount}/{catGuests.length}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-warm-gray transition-transform duration-300 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <Separator className="bg-rose-light/50" />
                    <div className="p-3 sm:p-4 space-y-2 max-h-[70vh] overflow-y-auto wedding-scrollbar">
                      {catGuests.map((guest) => {
                        const totalPersonas = guest.invitados;
                        const isAnimating = animatingId === guest.id;

                        return (
                          <div
                            key={guest.id}
                            className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
                              guest.arrived
                                ? 'bg-sage-light/50 border-sage/30 shadow-sm'
                                : 'bg-white border-rose-soft/20 hover:border-champagne/40 hover:shadow-sm'
                            } ${isAnimating ? 'scale-[1.02]' : ''}`}
                          >
                            {/* Check-in Button */}
                            <button
                              onClick={() => openCheckIn(guest)}
                              className={`shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                                guest.arrived
                                  ? 'bg-sage hover:bg-sage-dark text-white checkin-glow shadow-lg shadow-sage/30'
                                  : 'bg-white border-2 border-rose-soft text-rose-deep hover:border-rose-mid hover:bg-rose-light/50 shadow-sm'
                              } ${isAnimating ? 'checkin-pulse' : ''}`}
                              aria-label={
                                guest.arrived
                                  ? `Cancelar llegada de ${guest.nombre}`
                                  : `Registrar llegada de ${guest.nombre}`
                              }
                            >
                              {guest.arrived ? (
                                <Check className="h-5 w-5 sm:h-6 sm:w-6" />
                              ) : (
                                <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
                              )}
                            </button>

                            {/* Guest Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`font-semibold text-base sm:text-lg transition-colors ${
                                    guest.arrived
                                      ? 'text-sage-dark'
                                      : 'text-charcoal'
                                  }`}
                                >
                                  {guest.nombre}
                                </span>
                                <Badge
                                  className={`rounded-full text-xs font-medium px-2.5 py-0.5 ${
                                    guest.arrived
                                      ? 'bg-sage/80 text-white border-0'
                                      : 'bg-rose-light text-rose-deep border border-rose-soft/50'
                                  }`}
                                >
                                  {guest.arrived
                                    ? `${guest.arrivedCount}/${totalPersonas} persona${totalPersonas !== 1 ? 's' : ''}`
                                    : `${totalPersonas} persona${totalPersonas !== 1 ? 's' : ''}`}
                                </Badge>
                              </div>
                              {guest.arrived && guest.arrivedAt && (
                                <p className="text-xs text-sage-dark/70 mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Llegaron {guest.arrivedCount} persona{guest.arrivedCount !== 1 ? 's' : ''} a las {formatTime(guest.arrivedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        {/* Spacer for footer */}
        <div className="h-4" />
      </main>

      {/* ===== CHECK-IN DIALOG ===== */}
      <Dialog open={checkInGuest !== null} onOpenChange={(open) => { if (!open) setCheckInGuest(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-rose-soft/30 bg-white p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-rose-light/40 to-champagne-light/40 px-6 py-4">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-semibold text-charcoal flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-deep" />
                {checkInGuest?.arrived ? 'Modificar Llegada' : 'Registrar Llegada'}
              </DialogTitle>
              <DialogDescription className="text-warm-gray text-sm mt-1">
                ¿Cuántas personas {checkInGuest?.arrived ? 'han llegado en total' : 'llegaron'} con <span className="font-semibold text-charcoal">{checkInGuest?.nombre}</span>?
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-5 space-y-5">
            {/* Counter */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setCheckInCount((c) => Math.max(0, c - 1))}
                className="h-12 w-12 rounded-full border-2 border-rose-soft bg-white text-rose-deep hover:bg-rose-light/50 hover:border-rose-mid flex items-center justify-center transition-all active:scale-95"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="text-center min-w-[80px]">
                <Input
                  type="number"
                  min={0}
                  value={checkInCount}
                  onChange={(e) => setCheckInCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-16 w-20 text-center text-3xl font-bold text-charcoal rounded-xl border-rose-light/60 focus:border-champagne focus:ring-champagne/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <button
                onClick={() => setCheckInCount((c) => c + 1)}
                className="h-12 w-12 rounded-full border-2 border-sage bg-sage-light text-sage-dark hover:bg-sage hover:text-white flex items-center justify-center transition-all active:scale-95"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Info text */}
            <div className="text-center space-y-1">
              <p className="text-sm text-warm-gray">
                Esperadas: <span className="font-semibold text-charcoal">{checkInGuest?.invitados} persona{checkInGuest && checkInGuest.invitados !== 1 ? 's' : ''}</span>
              </p>
              {checkInCount !== checkInGuest?.invitados && checkInCount > 0 && (
                <p className={`text-xs font-medium ${checkInCount > (checkInGuest?.invitados || 0) ? 'text-champagne-dark' : 'text-rose-deep'}`}>
                  {checkInCount > (checkInGuest?.invitados || 0)
                    ? `+${checkInCount - (checkInGuest?.invitados || 0)} persona${checkInCount - (checkInGuest?.invitados || 0) !== 1 ? 's' : ''} extra${checkInCount - (checkInGuest?.invitados || 0) !== 1 ? 's' : ''}`
                    : `${checkInGuest ? (checkInGuest.invitados || 0) - checkInCount : 0} persona${(checkInGuest ? (checkInGuest.invitados || 0) - checkInCount : 0) !== 1 ? 's' : ''} menos`}
                </p>
              )}
              {checkInCount === 0 && (
                <p className="text-xs font-medium text-rose-deep">
                  Esto cancelará el registro de llegada
                </p>
              )}
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setCheckInCount(checkInGuest?.invitados || 0)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-champagne-light text-champagne-dark hover:bg-champagne hover:text-white transition-all"
              >
                Todas ({checkInGuest?.invitados || 0})
              </button>
              {checkInGuest && checkInGuest.invitados > 1 && (
                <button
                  onClick={() => setCheckInCount(1)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-rose-light text-rose-deep hover:bg-rose-soft hover:text-white transition-all"
                >
                  Solo 1
                </button>
              )}
              <button
                onClick={() => setCheckInCount(0)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-warm-gray hover:bg-gray-200 transition-all"
              >
                0 — No llegó
              </button>
            </div>
          </div>
          <DialogFooter className="px-6 pb-5 pt-0 flex gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setCheckInGuest(null)}
              className="flex-1 rounded-full border-rose-soft/40 text-warm-gray hover:text-charcoal hover:bg-rose-light/30 h-11"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => checkInGuest && confirmCheckIn(checkInGuest, checkInCount)}
              className={`flex-1 rounded-full h-11 font-medium shadow-md transition-all ${
                checkInCount === 0
                  ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  : 'bg-gradient-to-r from-sage to-sage-dark text-white hover:opacity-90'
              }`}
            >
              <Check className="h-4 w-4 mr-1.5" />
              {checkInCount === 0
                ? 'Cancelar Llegada'
                : checkInGuest?.arrived
                  ? `Actualizar a ${checkInCount} persona${checkInCount !== 1 ? 's' : ''}`
                  : `Registrar ${checkInCount} persona${checkInCount !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-rose-light/60 bg-white/60 backdrop-blur-sm mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {stats && (
            <div className="text-center space-y-3 mb-4">
              <div className="flex items-center justify-center gap-2 text-champagne text-sm">
                <span>✦</span>
                <span>✦</span>
                <span>✦</span>
              </div>
              <p className="text-sm font-medium text-warm-gray">
                {stats.totalArrived} de {stats.totalPersonas} personas han llegado
              </p>
              <div className="wedding-progress h-3 max-w-sm mx-auto">
                <div
                  className="wedding-progress-bar h-full"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              {stats.percentage === 100 && (
                <div className="flex items-center justify-center gap-2 text-sage-dark">
                  <PartyPopper className="h-5 w-5" />
                  <span className="text-sm font-semibold">¡Todos han llegado!</span>
                  <PartyPopper className="h-5 w-5" />
                </div>
              )}
            </div>
          )}
          <div className="floral-divider max-w-xs mx-auto mb-3">
            <Heart className="h-3.5 w-3.5 text-rose-soft shrink-0" />
          </div>
          <p className="text-center text-xs text-warm-gray/70 font-elegant">
            Con amor, en nuestro día más especial 💕
          </p>
        </div>
      </footer>
    </div>
  );
}
