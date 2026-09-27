-- Optional values preserve existing listings without guessing their emission data.
alter table public.car_listings
  add column if not exists emission_class text
    check (emission_class in ('Euro 1', 'Euro 2', 'Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'Нулеви емисии')),
  add column if not exists co2_g_km integer
    check (co2_g_km between 0 and 1000);

-- Electric vehicles have zero tailpipe CO2; Euro classes belong to combustion vehicles.
alter table public.car_listings
  add constraint electric_zero_tailpipe_emissions
    check (fuel <> 'Електрически' or (emission_class is not distinct from 'Нулеви емисии' and co2_g_km is not distinct from 0)),
  add constraint zero_emissions_only_electric
    check (emission_class is distinct from 'Нулеви емисии' or fuel = 'Електрически');
