/**
 * Short, friendly digestion facts Womby shares. Kept general and well established,
 * never personal advice. Wombat facts are about wombats, not people.
 */
export const GUT_FACTS: string[] = [
  "Wombats are the only animals known to make cube-shaped poo. A single wombat can leave 80 to 100 little cubes in one night.",
  "Scientists think wombat cubes help them mark their spot: flat sides mean they don't roll away.",
  "For most people, anywhere from three times a day to three times a week is a normal rhythm.",
  "Food usually takes one to three days to travel all the way through your gut.",
  "Poo is about three-quarters water. The rest is mostly fibre, gut bacteria and things your body is done with.",
  "The brown colour comes from bile. Your body breaks it down, and the leftovers tint everything on the way out.",
  "Your gut is home to trillions of microbes, and they help break down the fibre your body can't.",
  "Your gut has its own network of hundreds of millions of nerve cells. Some people call it the second brain.",
  "Eating can wake up your colon. It's called the gastrocolic reflex, and it's why many people go after breakfast.",
  "Your small intestine is about six metres long, all neatly folded up inside you.",
  "The Bristol Stool Scale was published in 1997 by doctors in Bristol, England. Types 3 and 4 are the classic smooth ones.",
  "Beets can turn things pink or red for a day or two. Iron tablets can make poo darker. Worth noting in your log.",
  "Digestion starts in your mouth: saliva begins breaking down starch before you've even swallowed.",
  "Fibre and water work as a team. Fibre holds on to water, which helps keep things soft.",
  "Resting your feet on a small step while you sit can make going easier for some people.",
  "Passing gas 10 to 20 times a day is completely ordinary. Everybody does it.",
  "Gentle movement, like a walk, helps your gut muscles keep things moving along.",
  "Your gut squeezes in waves called peristalsis, a bit like a slow, friendly conveyor belt.",
];

export function factIndexFor(seed: number) {
  return Math.abs(Math.floor(seed)) % GUT_FACTS.length;
}

/** Stable number from a string, so a page shows the same starting fact for the same thing. */
export function seedFrom(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}
