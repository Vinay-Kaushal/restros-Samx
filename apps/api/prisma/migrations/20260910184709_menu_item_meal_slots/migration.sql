-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "mealSlotId" TEXT;

-- CreateTable
CREATE TABLE "_MenuItemMealSlots" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_MenuItemMealSlots_AB_unique" ON "_MenuItemMealSlots"("A", "B");

-- CreateIndex
CREATE INDEX "_MenuItemMealSlots_B_index" ON "_MenuItemMealSlots"("B");

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES "MealSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MenuItemMealSlots" ADD CONSTRAINT "_MenuItemMealSlots_A_fkey" FOREIGN KEY ("A") REFERENCES "MealSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MenuItemMealSlots" ADD CONSTRAINT "_MenuItemMealSlots_B_fkey" FOREIGN KEY ("B") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
