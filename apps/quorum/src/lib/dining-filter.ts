// Decides whether a Qloo place entity is a real restaurant / food place.
// Qloo's filter.tags=urn:tag:genre:place:restaurant is loose (malls and hotels with
// a restaurant inside still match), so the planner also checks the entity's own
// primary place genre: the first `urn:tag:genre:place:*` tag (falling back to the
// first `urn:tag:category:place:*`) must be a food type.

export const DINING_TAG = "urn:tag:genre:place:restaurant";

type TagLike = { id?: string; tag_id?: string; type?: string; name?: string };
type EntityLike = { tags?: TagLike[] };

const FOOD = /(restaurant|cafe|caf[eé]|coffee|bakery|bistro|diner|eatery|food|pizz|deli|dessert|ice_cream|gelato|brunch|steakhouse|grill|gastropub|tea_house|noodle|ramen|sushi|taco|taqueria|bagel|brasserie|buffet|bbq|barbecue|creperie|patisserie|donut|sandwich|burger|dumpling|trattoria|osteria|izakaya|tapas)/i;

function tagId(tag: TagLike) {
  return (tag.id ?? tag.tag_id ?? "").toLowerCase();
}

function primary(tags: TagLike[], prefix: string) {
  return tags.map(tagId).find(id => id.startsWith(prefix));
}

export function isFoodPlace(entity: EntityLike): boolean {
  const tags = entity.tags ?? [];
  const main = primary(tags, "urn:tag:genre:place:") ?? primary(tags, "urn:tag:category:place:");
  if (!main) return false;
  return FOOD.test(main.split(":").pop() ?? "");
}
