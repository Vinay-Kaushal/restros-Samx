// Creates one restaurant with breakfast/lunch/dinner slots and a small menu -
// just enough to exercise the whole flow: QR landing -> menu -> demand
// badge -> checkout -> admin dashboard. No table/location concept - a QR
// scan lands straight on the restaurant's menu, matching a "one QR posted
// somewhere, deliver to whatever address the customer types in" model
// rather than per-table dine-in ordering.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-restaurant" },
    update: {},
    create: {
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      timezone: "Asia/Kolkata"
    }
  });

  // Cutoff set to 0 minutes so testing isn't blocked by the real-world
  // clock - see the note in the README if you want to test cutoff
  // enforcement with realistic values instead.
  const breakfast = await prisma.mealSlot.upsert({
    where: { id: "seed-breakfast" },
    update: {},
    create: { id: "seed-breakfast", restaurantId: restaurant.id, name: "breakfast", startTime: "07:00", endTime: "10:30", cutoffMinutes: 0 }
  });
  const lunch = await prisma.mealSlot.upsert({
    where: { id: "seed-lunch" },
    update: {},
    create: { id: "seed-lunch", restaurantId: restaurant.id, name: "lunch", startTime: "12:00", endTime: "23:59", cutoffMinutes: 0 }
  });
  const dinner = await prisma.mealSlot.upsert({
    where: { id: "seed-dinner" },
    update: {},
    create: { id: "seed-dinner", restaurantId: restaurant.id, name: "dinner", startTime: "19:00", endTime: "22:30", cutoffMinutes: 0 }
  });

  const mains = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: "Mains", sortOrder: 0 }
  });

  await prisma.menuItem.createMany({
    data: [
      { categoryId: mains.id, name: "Paneer Tikka", description: "Chargrilled cottage cheese", price: 220 },
      { categoryId: mains.id, name: "Butter Chicken", description: "With basmati rice", price: 280 },
      { categoryId: mains.id, name: "Dal Makhani", description: "Slow-cooked black lentils", price: 180 }
    ]
  });

  console.log("Seeded:");
  console.log(`  restaurant slug: ${restaurant.slug}`);
  console.log(`  meal slots: breakfast=${breakfast.id} lunch=${lunch.id} dinner=${dinner.id}`);
  console.log("");
  console.log(`  Customer app URL: http://localhost:3000/r/${restaurant.slug}`);
  console.log(`  (the menu page now shows all three as tabs - only the one matching the current time of day is orderable)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
