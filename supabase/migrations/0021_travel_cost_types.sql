-- Project-related travel spending gets first-class cost types.
alter type public.cost_type add value if not exists 'fuel';
alter type public.cost_type add value if not exists 'meals';
alter type public.cost_type add value if not exists 'accommodation';
