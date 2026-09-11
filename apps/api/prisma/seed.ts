// Creates one restaurant with breakfast/lunch/dinner slots and a small menu -
// just enough to exercise the whole flow. No table/location concept - a QR
// scan lands straight on the restaurant's menu, matching a "one QR posted
// somewhere, deliver to whatever address the customer types in" model.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-restaurant" },
    update: { name: "TVF Kitchens" },
    create: { name: "TVF Kitchens", slug: "demo-restaurant", timezone: "Asia/Kolkata" }
  });

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

  const mains = await prisma.menuCategory.upsert({
    where: { id: "seed-mains" },
    update: {},
    create: { id: "seed-mains", restaurantId: restaurant.id, name: "Mains", sortOrder: 0 }
  });

  // Deliberately assigned to DIFFERENT slots so breakfast/lunch/dinner
  // actually show different items - this is what the meal-slot <-> item
  // relation exists for. Items left with no slots (none here) would show
  // in all three, as a safe default for anything an admin hasn't assigned yet.
  const items: { id: string; name: string; description: string; price: number; slotIds: string[] }[] = [
    { id: "seed-poha", name: "Poha", description: "Flattened rice, turmeric, curry leaves", price: 90, slotIds: [breakfast.id] },
    { id: "seed-idli", name: "Idli Sambar", description: "Steamed rice cakes, lentil stew", price: 100, slotIds: [breakfast.id] },
    { id: "seed-paneer-tikka", name: "Paneer Tikka", description: "Chargrilled cottage cheese", price: 220, slotIds: [lunch.id, dinner.id] },
    { id: "seed-butter-chicken", name: "Butter Chicken", description: "With basmati rice", price: 280, slotIds: [lunch.id, dinner.id] },
    { id: "seed-dal-makhani", name: "Dal Makhani", description: "Slow-cooked black lentils", price: 180, slotIds: [lunch.id, dinner.id] },
    { id: "seed-biryani", name: "Hyderabadi Biryani", description: "Slow-cooked basmati, whole spices", price: 260, slotIds: [dinner.id] }
  ];

  for (const item of items) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: { mealSlots: { set: item.slotIds.map((id) => ({ id })) } },
      create: {
        id: item.id,
        categoryId: mains.id,
        name: item.name,
        description: item.description,
        price: item.price,
        mealSlots: { connect: item.slotIds.map((id) => ({ id })) }
      }
    });
  }

  console.log("Seeded:");
  console.log(`  restaurant slug: ${restaurant.slug}`);
  console.log(`  meal slots: breakfast=${breakfast.id} lunch=${lunch.id} dinner=${dinner.id}`);
  console.log("");
  console.log(`  Customer app URL: http://localhost:3000/r/${restaurant.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
