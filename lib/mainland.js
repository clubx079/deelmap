// Single source of truth for the states/territories the marketplace does not
// serve (off the U.S. mainland). Applied to every buyer-facing deals/properties
// query so "mainland only" is defined once and can't drift per-query.
export const OFF_MAINLAND = ['HI', 'AK', 'PR']

// PostgREST value list, e.g. ("HI","AK","PR")
const OFF_MAINLAND_LIST = `(${OFF_MAINLAND.map((s) => `"${s}"`).join(',')})`

// Chainable: excludes any row whose `state` is in OFF_MAINLAND.
export const excludeOffMainland = (q) => q.not('state', 'in', OFF_MAINLAND_LIST)
