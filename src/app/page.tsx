'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Check,
  Users,
  Clock,
  ChevronDown,
  Heart,
  Sparkles,
  PartyPopper,
  UserCheck,
  Plus,
  Minus,
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

// ===== VIVID, DISTINCTIVE CATEGORY COLORS =====
// Each category gets a bold, easily-identifiable color
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string; light: string; badge: string; card: string }> = {
  'Familia Hdez': {
    bg: 'bg-rose-500',
    text: 'text-rose-600',
    border: 'border-l-rose-500',
    dot: 'bg-rose-500',
    light: 'bg-rose-50',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    card: 'bg-rose-50/60 border-rose-100',
  },
  'Fam. Estrada': {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-l-amber-500',
    dot: 'bg-amber-500',
    light: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    card: 'bg-amber-50/60 border-amber-100',
  },
  'DIF': {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
    light: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    card: 'bg-emerald-50/60 border-emerald-100',
  },
  'Maestros': {
    bg: 'bg-violet-500',
    text: 'text-violet-600',
    border: 'border-l-violet-500',
    dot: 'bg-violet-500',
    light: 'bg-violet-50',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    card: 'bg-violet-50/60 border-violet-100',
  },
  'Amigos de la familia': {
    bg: 'bg-teal-500',
    text: 'text-teal-600',
    border: 'border-l-teal-500',
    dot: 'bg-teal-500',
    light: 'bg-teal-50',
    badge: 'bg-teal-100 text-teal-700 border-teal-200',
    card: 'bg-teal-50/60 border-teal-100',
  },
  'Familiar lejano': {
    bg: 'bg-purple-500',
    text: 'text-purple-600',
    border: 'border-l-purple-500',
    dot: 'bg-purple-500',
    light: 'bg-purple-50',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    card: 'bg-purple-50/60 border-purple-100',
  },
  'Amigos de la familia (Especial Gobierno)': {
    bg: 'bg-sky-500',
    text: 'text-sky-600',
    border: 'border-l-sky-500',
    dot: 'bg-sky-500',
    light: 'bg-sky-50',
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    card: 'bg-sky-50/60 border-sky-100',
  },
  'presidencia': {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    border: 'border-l-blue-600',
    dot: 'bg-blue-600',
    light: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    card: 'bg-blue-50/60 border-blue-100',
  },
  'Amigos de la familia (Especial)': {
    bg: 'bg-pink-500',
    text: 'text-pink-600',
    border: 'border-l-pink-500',
    dot: 'bg-pink-500',
    light: 'bg-pink-50',
    badge: 'bg-pink-100 text-pink-700 border-pink-200',
    card: 'bg-pink-50/60 border-pink-100',
  },
  'Familia': {
    bg: 'bg-orange-500',
    text: 'text-orange-600',
    border: 'border-l-orange-500',
    dot: 'bg-orange-500',
    light: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    card: 'bg-orange-50/60 border-orange-100',
  },
  'educación especial': {
    bg: 'bg-lime-500',
    text: 'text-lime-600',
    border: 'border-l-lime-500',
    dot: 'bg-lime-500',
    light: 'bg-lime-50',
    badge: 'bg-lime-100 text-lime-700 border-lime-200',
    card: 'bg-lime-50/60 border-lime-100',
  },
  'educación especial amigos': {
    bg: 'bg-cyan-500',
    text: 'text-cyan-600',
    border: 'border-l-cyan-500',
    dot: 'bg-cyan-500',
    light: 'bg-cyan-50',
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    card: 'bg-cyan-50/60 border-cyan-100',
  },
  // Legacy categories (kept for compatibility)
  'P': {
    bg: 'bg-sky-500',
    text: 'text-sky-600',
    border: 'border-l-sky-500',
    dot: 'bg-sky-500',
    light: 'bg-sky-50',
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    card: 'bg-sky-50/60 border-sky-100',
  },
  'Palomita': {
    bg: 'bg-pink-400',
    text: 'text-pink-600',
    border: 'border-l-pink-400',
    dot: 'bg-pink-400',
    light: 'bg-pink-50',
    badge: 'bg-pink-100 text-pink-700 border-pink-200',
    card: 'bg-pink-50/60 border-pink-100',
  },
  'Policía': {
    bg: 'bg-indigo-500',
    text: 'text-indigo-600',
    border: 'border-l-indigo-500',
    dot: 'bg-indigo-500',
    light: 'bg-indigo-50',
    badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    card: 'bg-indigo-50/60 border-indigo-100',
  },
  'Familia y Amigos': {
    bg: 'bg-orange-400',
    text: 'text-orange-600',
    border: 'border-l-orange-400',
    dot: 'bg-orange-400',
    light: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    card: 'bg-orange-50/60 border-orange-100',
  },
};

const DEFAULT_STYLE = {
  bg: 'bg-gray-500',
  text: 'text-gray-600',
  border: 'border-l-gray-500',
  dot: 'bg-gray-500',
  light: 'bg-gray-50',
  badge: 'bg-gray-100 text-gray-700 border-gray-200',
  card: 'bg-gray-50/60 border-gray-100',
};

function getCatStyle(cat: string) {
  return CATEGORY_STYLES[cat] || DEFAULT_STYLE;
}

export default function Home() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
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

  const openCheckIn = (guest: Guest) => {
    setCheckInGuest(guest);
    setCheckInCount(guest.arrived ? guest.arrivedCount : guest.invitados);
  };

  const confirmCheckIn = async (guest: Guest, count: number) => {
    // If already arrived, only allow adding more (cannot lower or cancel)
    if (guest.arrived && count <= guest.arrivedCount) {
      setCheckInGuest(null);
      return;
    }

    setCheckInGuest(null);

    const newArrived = count > 0;
    const newArrivedAt = newArrived ? new Date().toISOString() : null;
    const oldCount = guest.arrived ? guest.arrivedCount : 0;

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
        }
      }
    } catch {
      await loadData();
      toast.error('Error de conexión');
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

  const getCategoryArrived = (cat: string, guestsList: Guest[]): { arrived: number; totalPersonas: number; arrivedPersons: number } => {
    const arrived = guestsList.filter((g) => g.arrived).length;
    const totalPersonas = guestsList.reduce((s, g) => s + g.invitados, 0);
    const arrivedPersons = guestsList.reduce((s, g) => s + (g.arrived ? g.arrivedCount : 0), 0);
    return { arrived, totalPersonas, arrivedPersons };
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
          <p className="text-warm-gray">No hay invitados cargados</p>
          <a
            href="/admin"
            className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-soft to-champagne text-white rounded-full text-sm font-medium shadow-lg hover:from-rose-mid hover:to-champagne-dark transition-all"
          >
            Cargar Base de Datos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      {/* ===== HEADER — Compact on mobile ===== */}
      <header className="wedding-header-bg border-b border-rose-light">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
          <div className="text-center space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-champagne text-xs sm:text-sm">
              <span>✦</span>
              <span>✦</span>
              <span>✦</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-elegant text-rose-deep">
              Nuestra Boda
            </h1>

            <div className="floral-divider max-w-[180px] sm:max-w-xs mx-auto">
              <Heart className="h-3 w-3 text-rose-soft shrink-0" />
            </div>

            <p className="text-xs sm:text-sm text-warm-gray tracking-wide">
              Registro de Invitados
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-3 sm:px-4 py-4 space-y-4">
        {/* ===== STATS DASHBOARD — Ultra compact single row ===== */}
        {stats && (
          <div className="fade-in-up">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-rose-soft/20 shadow-sm">
              {/* Total */}
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Users className="h-3 w-3 text-rose-deep" />
                  <span className="text-[9px] font-semibold text-warm-gray/70 uppercase tracking-wide">Total</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-charcoal leading-tight">{stats.totalPersonas}</p>
              </div>

              <div className="w-px h-8 bg-gray-200/60" />

              {/* Llegaron */}
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <UserCheck className="h-3 w-3 text-emerald-500" />
                  <span className="text-[9px] font-semibold text-warm-gray/70 uppercase tracking-wide">Llegaron</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-emerald-600 leading-tight">{stats.totalArrived}</p>
              </div>

              <div className="w-px h-8 bg-gray-200/60" />

              {/* Pendientes */}
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Clock className="h-3 w-3 text-amber-500" />
                  <span className="text-[9px] font-semibold text-warm-gray/70 uppercase tracking-wide">Pendientes</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-amber-600 leading-tight">{stats.totalPending}</p>
              </div>

              <div className="w-px h-8 bg-gray-200/60" />

              {/* Progreso */}
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Sparkles className="h-3 w-3 text-rose-deep" />
                  <span className="text-[9px] font-semibold text-warm-gray/70 uppercase tracking-wide">Progreso</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-rose-deep leading-tight">{stats.percentage}%</p>
                <div className="mt-1 wedding-progress h-1.5">
                  <div
                    className="wedding-progress-bar h-full"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== SEARCH BAR — Big, prominent, sticky on mobile ===== */}
        <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 sm:static sm:-mx-4 sm:px-4 sm:pt-0 sm:pb-0 bg-ivory/95 backdrop-blur-md sm:bg-transparent sm:backdrop-blur-none">
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 w-6 rounded-full bg-rose-light/60">
              <Search className="h-4 w-4 text-rose-deep group-focus-within:text-champagne transition-colors" />
            </div>
            <Input
              placeholder="Buscar invitado por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 sm:h-16 rounded-2xl border-2 border-rose-light/50 bg-white shadow-md focus:border-champagne focus:ring-2 focus:ring-champagne/20 text-charcoal placeholder:text-warm-gray/50 text-lg sm:text-xl font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <span className="text-warm-gray text-sm font-bold">×</span>
              </button>
            )}
          </div>
        </div>

        {/* ===== CATEGORY FILTERS — Horizontal scroll on mobile ===== */}
        <div className="fade-in-up">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 category-scroll sm:flex-wrap sm:overflow-x-visible sm:mx-0 sm:px-0">
            <button
              onClick={() => setCategoriaFilter('all')}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border-2 transition-all ${
                categoriaFilter === 'all'
                  ? 'border-charcoal bg-charcoal text-white shadow-md'
                  : 'border-gray-200 text-warm-gray hover:border-gray-300 bg-white'
              }`}
            >
              <Users className="h-3 w-3" />
              Todas
            </button>
            {categories.map((cat) => {
              const style = getCatStyle(cat);
              const isActive = categoriaFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoriaFilter(isActive ? 'all' : cat)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border-2 transition-all ${
                    isActive
                      ? `${style.bg} text-white border-transparent shadow-md`
                      : `border-gray-200 text-warm-gray hover:border-gray-300 bg-white`
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white/50' : style.dot}`} />
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== STATUS FILTER + RESET ===== */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {[
              { key: 'all', label: 'Todos', icon: Users },
              { key: 'arrived', label: '✓ Llegaron', icon: Check },
              { key: 'pending', label: '○ Pendientes', icon: Clock },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium border transition-all ${
                  statusFilter === key
                    ? 'border-charcoal bg-charcoal text-white'
                    : 'border-gray-200 text-warm-gray hover:border-gray-300 bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== GUEST LIST ===== */}
        <div className="space-y-3 fade-in-up">
          {sortedCategories.length === 0 && !loading && (
            <Card className="rounded-xl border border-rose-soft/20 bg-white/80 shadow-sm">
              <CardContent className="p-8 text-center space-y-4">
                <div className="text-5xl mb-2">💍</div>
                <p className="text-warm-gray font-medium">No se encontraron invitados</p>
                <p className="text-xs text-warm-gray/70">Carga la lista de invitados para comenzar</p>
                <a
                  href="/admin"
                  className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-soft to-champagne text-white rounded-full text-sm font-medium shadow-md hover:from-rose-mid hover:to-champagne-dark transition-all"
                >
                  Ir a Cargar Base de Datos
                </a>
              </CardContent>
            </Card>
          )}

          {sortedCategories.map((cat) => {
            const catGuests = groupedGuests[cat];
            const { arrived: catArrivedCount, totalPersonas: catTotalPersonas, arrivedPersons } = getCategoryArrived(cat, catGuests);
            const isOpen = openCategories[cat] !== false;
            const style = getCatStyle(cat);

            return (
              <div
                key={cat}
                className={`rounded-xl sm:rounded-2xl border overflow-hidden shadow-sm transition-all ${style.card}`}
              >
                {/* Category header — always visible as toggle */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full"
                >
                  <div className="flex items-center justify-between px-3.5 sm:px-4 py-3 sm:py-3.5">
                    <div className="flex items-center gap-2.5">
                      {/* Color dot */}
                      <span className={`h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full ${style.dot} ring-2 ring-offset-1 ${style.light}`} />

                      <span className={`font-bold text-sm sm:text-base ${style.text}`}>
                        {cat}
                      </span>

                      {/* Mini stats */}
                      <div className="hidden sm:flex items-center gap-2 text-xs text-warm-gray">
                        <span className="px-2 py-0.5 rounded-full bg-white/70 border border-gray-100 font-medium">
                          {arrivedPersons}/{catTotalPersonas} personas
                        </span>
                        <span className="text-warm-gray/60">
                          {catArrivedCount}/{catGuests.length} grupos
                        </span>
                      </div>

                      {/* Mobile mini stats */}
                      <span className="sm:hidden text-[11px] font-medium text-warm-gray bg-white/60 px-2 py-0.5 rounded-full">
                        {arrivedPersons}/{catTotalPersonas}
                      </span>
                    </div>

                    <ChevronDown
                      className={`h-4 w-4 text-warm-gray/70 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Guest rows */}
                {isOpen && (
                  <>
                    <div className="h-px bg-gray-200/50 mx-3.5 sm:mx-4" />
                    <div className="p-2 sm:p-2.5 space-y-1.5">
                      {catGuests.map((guest) => {
                        const totalPersonas = guest.invitados;
                        const isAnimating = animatingId === guest.id;

                        return (
                          <div
                            key={guest.id}
                            onClick={() => openCheckIn(guest)}
                            className={`active:scale-[0.98] transition-all duration-200 cursor-pointer rounded-lg border-l-4 ${
                              style.border
                            } ${
                              guest.arrived
                                ? 'bg-emerald-50/50 border border-gray-100 border-l-4 shadow-sm'
                                : 'bg-white border border-gray-100 hover:shadow-sm'
                            } ${isAnimating ? 'scale-[1.02]' : ''}`}
                          >
                            <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                              {/* Check-in indicator */}
                              <div className={`shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition-all ${
                                guest.arrived
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                  : 'bg-gray-100 text-gray-400'
                              } ${isAnimating ? 'checkin-pulse' : ''}`}>
                                {guest.arrived ? (
                                  <Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} />
                                ) : (
                                  <UserCheck className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                                )}
                              </div>

                              {/* Guest info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold text-sm sm:text-base truncate ${
                                    guest.arrived ? 'text-emerald-700' : 'text-charcoal'
                                  }`}>
                                    {guest.nombre}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {guest.arrived ? (
                                    <span className="text-[11px] sm:text-xs text-emerald-600 font-medium">
                                      ✓ {guest.arrivedCount}/{totalPersonas} personas
                                    </span>
                                  ) : (
                                    <span className="text-[11px] sm:text-xs text-warm-gray">
                                      {totalPersonas} persona{totalPersonas !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {guest.arrived && guest.arrivedAt && (
                                    <span className="text-[10px] text-warm-gray/60">
                                      · {formatTime(guest.arrivedAt)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Tap hint for mobile */}
                              {!guest.arrived && (
                                <div className="shrink-0 hidden sm:flex items-center">
                                  <span className="text-[10px] text-warm-gray/50 font-medium">Toca para registrar</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="h-4" />
      </main>

      {/* ===== CHECK-IN DIALOG — Mobile-optimized ===== */}
      <Dialog open={checkInGuest !== null} onOpenChange={(open) => { if (!open) setCheckInGuest(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-gray-200 bg-white p-0 overflow-hidden mx-4 [max-width:calc(100%-2rem)]">
          {checkInGuest && (
            <>
              {/* Dialog header with category color */}
              <div className={`px-5 py-4 ${getCatStyle(checkInGuest.categoria).light}`}>
                <DialogHeader className="text-left">
                  <DialogTitle className="text-base sm:text-lg font-semibold text-charcoal flex items-center gap-2">
                    {checkInGuest.arrived ? (
                      <span className="flex items-center justify-center h-7 w-7 rounded-full bg-emerald-500 text-white">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    ) : (
                      <Heart className="h-5 w-5 text-rose-deep" />
                    )}
                    {checkInGuest.arrived ? 'Agregar Personas' : 'Registrar Llegada'}
                  </DialogTitle>
                  <DialogDescription className="text-warm-gray text-sm mt-1.5">
                    {checkInGuest.arrived
                      ? <><span className="font-semibold text-charcoal">{checkInGuest.nombre}</span> ya llegó con {checkInGuest.arrivedCount} persona{checkInGuest.arrivedCount !== 1 ? 's' : ''}. ¿Llegaron más?</>
                      : <>¿Cuántas personas llegaron con <span className="font-semibold text-charcoal">{checkInGuest.nombre}</span>?</>}
                  </DialogDescription>
                  {/* Category badge */}
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getCatStyle(checkInGuest.categoria).badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getCatStyle(checkInGuest.categoria).dot}`} />
                      {checkInGuest.categoria}
                    </span>
                  </div>
                </DialogHeader>
              </div>

              <div className="px-5 py-5 space-y-5">
                {/* Counter */}
                <div className="flex items-center justify-center gap-5 sm:gap-6">
                  <button
                    onClick={() => setCheckInCount((c) => Math.max(checkInGuest.arrived ? checkInGuest.arrivedCount : 0, c - 1))}
                    disabled={checkInGuest.arrived ? checkInCount <= checkInGuest.arrivedCount : checkInCount <= 0}
                    className={`h-14 w-14 rounded-2xl border-2 border-gray-200 bg-white text-charcoal flex items-center justify-center transition-all active:scale-90 ${
                      checkInGuest.arrived
                        ? (checkInCount <= checkInGuest.arrivedCount ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-50 active:bg-gray-100 border-gray-300')
                        : checkInCount <= 0
                          ? 'opacity-20 cursor-not-allowed'
                          : 'hover:bg-gray-50 active:bg-gray-100 border-gray-300'
                    }`}
                  >
                    <Minus className="h-6 w-6" strokeWidth={2.5} />
                  </button>
                  <div className="text-center min-w-[80px]">
                    <Input
                      type="number"
                      min={checkInGuest.arrived ? checkInGuest.arrivedCount : 0}
                      value={checkInCount}
                      onChange={(e) => {
                        const min = checkInGuest.arrived ? checkInGuest.arrivedCount : 0;
                        setCheckInCount(Math.max(min, parseInt(e.target.value) || 0));
                      }}
                      className="h-16 w-20 text-center text-4xl font-bold text-charcoal rounded-2xl border-gray-200 focus:border-champagne focus:ring-champagne/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-gray-50"
                    />
                  </div>
                  <button
                    onClick={() => setCheckInCount((c) => c + 1)}
                    className="h-14 w-14 rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 flex items-center justify-center transition-all active:scale-90 shadow-sm"
                  >
                    <Plus className="h-6 w-6" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Info text */}
                <div className="text-center space-y-1">
                  <p className="text-sm text-warm-gray">
                    {checkInGuest.arrived
                      ? <>Ya registradas: <span className="font-bold text-emerald-600">{checkInGuest.arrivedCount} persona{checkInGuest.arrivedCount !== 1 ? 's' : ''}</span></>
                      : <>Esperadas: <span className="font-bold text-charcoal">{checkInGuest.invitados} persona{checkInGuest.invitados !== 1 ? 's' : ''}</span></>}
                  </p>
                  {checkInCount > (checkInGuest.arrived ? checkInGuest.arrivedCount : 0) && (
                    <p className="text-sm font-bold text-emerald-600">
                      +{checkInCount - (checkInGuest.arrived ? checkInGuest.arrivedCount : 0)} persona{checkInCount - (checkInGuest.arrived ? checkInGuest.arrivedCount : 0) !== 1 ? 's' : ''} más
                    </p>
                  )}
                </div>

                {/* Quick buttons */}
                <div className="flex flex-wrap justify-center gap-2">
                  {!checkInGuest.arrived && (
                    <>
                      <button
                        onClick={() => setCheckInCount(checkInGuest.invitados || 0)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 active:bg-amber-200 transition-all border border-amber-200"
                      >
                        Todas ({checkInGuest.invitados || 0})
                      </button>
                      {checkInGuest.invitados > 1 && (
                        <button
                          onClick={() => setCheckInCount(1)}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200 transition-all border border-rose-200"
                        >
                          Solo 1
                        </button>
                      )}
                    </>
                  )}
                  {checkInGuest.arrived && (
                    <button
                      onClick={() => setCheckInCount(checkInGuest.arrivedCount + 1)}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 transition-all border border-emerald-200"
                    >
                      +1 persona más
                    </button>
                  )}
                </div>
              </div>

              <DialogFooter className="px-5 pb-5 pt-0 flex gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setCheckInGuest(null)}
                  className="flex-1 rounded-xl border-gray-200 text-warm-gray hover:text-charcoal hover:bg-gray-50 h-12 text-sm font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => confirmCheckIn(checkInGuest, checkInCount)}
                  disabled={checkInGuest.arrived && checkInCount <= checkInGuest.arrivedCount}
                  className={`flex-1 rounded-xl h-12 text-sm font-semibold shadow-md transition-all active:scale-[0.97] ${
                    checkInGuest.arrived && checkInCount <= checkInGuest.arrivedCount
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {checkInGuest.arrived
                    ? checkInCount > checkInGuest.arrivedCount
                      ? `+${checkInCount - checkInGuest.arrivedCount} persona${checkInCount - checkInGuest.arrivedCount !== 1 ? 's' : ''}`
                      : 'Sin cambios'
                    : `Registrar ${checkInCount} persona${checkInCount !== 1 ? 's' : ''}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-rose-light/40 bg-white/60 backdrop-blur-sm mt-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-5">
          {stats && (
            <div className="text-center space-y-2 mb-3">
              <p className="text-sm font-medium text-warm-gray">
                {stats.totalArrived} de {stats.totalPersonas} personas
              </p>
              <div className="wedding-progress h-2.5 max-w-xs mx-auto">
                <div
                  className="wedding-progress-bar h-full"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              {stats.percentage === 100 && (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <PartyPopper className="h-4 w-4" />
                  <span className="text-sm font-bold">¡Todos han llegado!</span>
                  <PartyPopper className="h-4 w-4" />
                </div>
              )}
            </div>
          )}
          <div className="floral-divider max-w-[180px] mx-auto mb-2">
            <Heart className="h-3 w-3 text-rose-soft shrink-0" />
          </div>
          <p className="text-center text-[10px] sm:text-xs text-warm-gray/60 font-elegant">
            Con amor, en nuestro día más especial 💕
          </p>
        </div>
      </footer>
    </div>
  );
}
