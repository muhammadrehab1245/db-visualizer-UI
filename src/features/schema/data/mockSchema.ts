import type { DatabaseSchema } from '../../../shared/types/schema';

/** Sakila-style mock schema for the ER diagram MVP */
export const mockSchema: DatabaseSchema = {
  tables: [
    {
      id: 'language',
      name: 'language',
      columns: [
        { name: 'language_id', type: 'TINYINT UNSIGNED', pk: true },
        { name: 'name', type: 'CHAR(20)' },
        { name: 'last_update', type: 'TIMESTAMP' },
      ],
    },
    {
      id: 'film',
      name: 'film',
      columns: [
        { name: 'film_id', type: 'SMALLINT UNSIGNED', pk: true },
        { name: 'title', type: 'VARCHAR(255)' },
        { name: 'description', type: 'TEXT' },
        { name: 'release_year', type: 'YEAR' },
        {
          name: 'language_id',
          type: 'TINYINT UNSIGNED',
          fk: { table: 'language', column: 'language_id' },
        },
        { name: 'rental_duration', type: 'TINYINT UNSIGNED' },
        { name: 'rental_rate', type: 'DECIMAL(4,2)' },
        { name: 'length', type: 'SMALLINT UNSIGNED' },
        { name: 'last_update', type: 'TIMESTAMP' },
      ],
    },
    {
      id: 'actor',
      name: 'actor',
      columns: [
        { name: 'actor_id', type: 'SMALLINT UNSIGNED', pk: true },
        { name: 'first_name', type: 'VARCHAR(45)' },
        { name: 'last_name', type: 'VARCHAR(45)' },
        { name: 'last_update', type: 'TIMESTAMP' },
      ],
    },
    {
      id: 'film_actor',
      name: 'film_actor',
      columns: [
        {
          name: 'actor_id',
          type: 'SMALLINT UNSIGNED',
          pk: true,
          fk: { table: 'actor', column: 'actor_id' },
        },
        {
          name: 'film_id',
          type: 'SMALLINT UNSIGNED',
          pk: true,
          fk: { table: 'film', column: 'film_id' },
        },
        { name: 'last_update', type: 'TIMESTAMP' },
      ],
    },
  ],
};
