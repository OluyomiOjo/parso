-- Collection pages show no description (owner decision after build 16), so none are written any more. Existing ones
-- are cleared so installed builds stop showing them; a copy is kept in private.collection_descriptions_before_0026.
-- collections.described_count (0026) is left in place, unused.
update public.collections set description = null where description is not null;
