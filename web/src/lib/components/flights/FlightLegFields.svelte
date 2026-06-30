<script lang="ts" module>
    import type { AirportSnapshot } from '$lib/db';

    export interface FormLeg {
        airline: string;
        flightNumber: string;
        from?: AirportSnapshot;
        to?: AirportSnapshot;
        departLocal: string;
        arriveLocal: string;
        seat: string;
        terminal: string;
        gate: string;
        baggage: string;
        checkInOpensAt: string;
    }

    let nextId = 0;
</script>

<script lang="ts">
    import { Field, Input } from '$lib/components/ui';
    import { Trash2 } from 'lucide-svelte';
    import AirportInput from './AirportInput.svelte';

    interface Props {
        leg: FormLeg;
        index: number;
        canRemove?: boolean;
        /** Human-readable duration text from `computeFlight` (display only). */
        durationText?: string;
        /** Calendar days arrival is after departure (1 = "+1"). */
        arrivalDayOffset?: number;
        error?: string | null;
        onremove?: () => void;
    }

    let {
        leg,
        index,
        canRemove = false,
        durationText = '',
        arrivalDayOffset = 0,
        error = null,
        onremove
    }: Props = $props();

    const uid = ++nextId;
    const fid = (s: string) => `leg-${s}-${uid}`;
</script>

<fieldset class="rounded-lg border border-border bg-surface-sunken/50 p-3">
    <legend class="flex w-full items-center justify-between gap-1">
        <span class="text-sm font-semibold text-ink">Leg {index + 1}</span>
        {#if canRemove}
            <button
                type="button"
                onclick={onremove}
                class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-danger hover:underline [&_svg]:size-3.5"
            >
                <Trash2 /> Remove
            </button>
        {/if}
    </legend>

    <div class="mt-2 flex flex-col gap-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Airline" for={fid('airline')}>
                <Input
                    id={fid('airline')}
                    value={leg.airline}
                    placeholder="Lufthansa"
                    oninput={(e) => (leg.airline = e.currentTarget.value)}
                />
            </Field>
            <Field label="Flight no." for={fid('no')}>
                <Input
                    id={fid('no')}
                    value={leg.flightNumber}
                    placeholder="LH388"
                    oninput={(e) => (leg.flightNumber = e.currentTarget.value)}
                />
            </Field>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="From" for={fid('from')}>
                <AirportInput
                    id={fid('from')}
                    value={leg.from}
                    placeholder="Origin – city or code"
                    onchange={(v) => (leg.from = v)}
                />
            </Field>
            <Field label="To" for={fid('to')}>
                <AirportInput
                    id={fid('to')}
                    value={leg.to}
                    placeholder="Destination – city or code"
                    onchange={(v) => (leg.to = v)}
                />
            </Field>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
                label="Departs"
                for={fid('dep')}
                hint={leg.from?.tz ? `Local time · ${leg.from.tz}` : 'Local time at the origin'}
            >
                <Input
                    id={fid('dep')}
                    type="datetime-local"
                    value={leg.departLocal}
                    oninput={(e) => (leg.departLocal = e.currentTarget.value)}
                />
            </Field>
            <Field
                label="Arrives"
                for={fid('arr')}
                error={error}
                hint={leg.to?.tz ? `Local time · ${leg.to.tz}` : 'Local time at the destination'}
            >
                <Input
                    id={fid('arr')}
                    type="datetime-local"
                    value={leg.arriveLocal}
                    invalid={!!error}
                    oninput={(e) => (leg.arriveLocal = e.currentTarget.value)}
                />
            </Field>
        </div>

        {#if durationText || arrivalDayOffset > 0}
            <p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                {#if durationText}{durationText}{/if}
                {#if arrivalDayOffset > 0}
                    <span class="rounded-full bg-accent-terracotta/15 px-2 py-0.5 font-medium text-accent-terracotta">
                        Arrives +{arrivalDayOffset} day{arrivalDayOffset > 1 ? 's' : ''}
                    </span>
                {/if}
            </p>
        {/if}

        <div class="grid grid-cols-3 gap-3">
            <Field label="Seat" for={fid('seat')}>
                <Input
                    id={fid('seat')}
                    value={leg.seat}
                    placeholder="14F"
                    oninput={(e) => (leg.seat = e.currentTarget.value)}
                />
            </Field>
            <Field label="Terminal" for={fid('term')}>
                <Input
                    id={fid('term')}
                    value={leg.terminal}
                    placeholder="T1"
                    oninput={(e) => (leg.terminal = e.currentTarget.value)}
                />
            </Field>
            <Field label="Gate" for={fid('gate')}>
                <Input
                    id={fid('gate')}
                    value={leg.gate}
                    placeholder="B12"
                    oninput={(e) => (leg.gate = e.currentTarget.value)}
                />
            </Field>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Baggage" for={fid('bag')}>
                <Input
                    id={fid('bag')}
                    value={leg.baggage}
                    placeholder="1 × 23kg"
                    oninput={(e) => (leg.baggage = e.currentTarget.value)}
                />
            </Field>
            <Field label="Check-in opens" for={fid('ci')}>
                <Input
                    id={fid('ci')}
                    type="datetime-local"
                    value={leg.checkInOpensAt}
                    oninput={(e) => (leg.checkInOpensAt = e.currentTarget.value)}
                />
            </Field>
        </div>
    </div>
</fieldset>