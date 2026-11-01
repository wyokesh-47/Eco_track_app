-- Run this once in the Supabase SQL Editor to create EcoTrack's bin tables.

create table if not exists public.bins (
  id text primary key,
  name text not null,
  address text not null,
  waste_type text not null,
  fill_percent numeric(5, 2) check (fill_percent between 0 and 100),
  alert boolean not null default false,
  last_reading_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  bin_id text not null references public.bins(id) on delete cascade,
  distance_cm numeric(6, 2) not null check (distance_cm between 2 and 400),
  fill_percent numeric(5, 2) not null check (fill_percent between 0 and 100),
  alert boolean not null,
  recorded_at timestamptz not null default now()
);

create index if not exists sensor_readings_bin_recorded_idx
  on public.sensor_readings (bin_id, recorded_at desc);

insert into public.bins (id, name, address, waste_type)
values
  ('bin-01', 'Bin 01', 'Main Road', 'Dry waste'),
  ('bin-02', 'Bin 02', 'TRP Area', 'Wet waste'),
  ('bin-03', 'Bin 03', 'Science Block', 'Wet waste')
on conflict (id) do nothing;

create or replace function public.update_bin_from_sensor_reading()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bins
  set fill_percent = new.fill_percent,
      alert = new.alert,
      last_reading_at = new.recorded_at,
      updated_at = now()
  where id = new.bin_id
    and (last_reading_at is null or last_reading_at <= new.recorded_at);

  return new;
end;
$$;

revoke all on function public.update_bin_from_sensor_reading() from public;

drop trigger if exists sensor_readings_update_bin on public.sensor_readings;
create trigger sensor_readings_update_bin
after insert on public.sensor_readings
for each row execute function public.update_bin_from_sensor_reading();

alter table public.bins enable row level security;
alter table public.sensor_readings enable row level security;
