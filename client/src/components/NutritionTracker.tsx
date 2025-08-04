
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Apple, Zap, Beef } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Nutrition, CreateNutritionInput } from '../../../server/src/schema';

interface NutritionTrackerProps {
  userId: number;
  onUpdate: () => void;
}

export function NutritionTracker({ userId, onUpdate }: NutritionTrackerProps) {
  const [nutrition, setNutrition] = useState<Nutrition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<CreateNutritionInput>({
    user_id: userId,
    meal_type: 'breakfast',
    food_item: '',
    quantity: '',
    calories: undefined,
    protein: undefined,
    carbs: undefined,
    fat: undefined,
    notes: null,
    recorded_at: undefined
  });

  const loadNutrition = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getNutrition.query({ userId });
      setNutrition(result);
    } catch (error) {
      console.error('Failed to load nutrition:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadNutrition();
  }, [loadNutrition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.food_item || !formData.quantity) return;

    setIsSubmitting(true);
    try {
      await trpc.createNutrition.mutate(formData);
      
      // Reset form
      setFormData({
        user_id: userId,
        meal_type: 'breakfast',
        food_item: '',
        quantity: '',
        calories: undefined,
        protein: undefined,
        carbs: undefined,
        fat: undefined,
        notes: null,
        recorded_at: undefined
      });
      
      setShowForm(false);
      await loadNutrition();
      onUpdate();
    } catch (error) {
      console.error('Failed to create nutrition entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'bg-yellow-100 text-yellow-800';
      case 'lunch': return 'bg-green-100 text-green-800';
      case 'dinner': return 'bg-blue-100 text-blue-800';
      case 'snack': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMealTypeEmoji = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snack': return '🍎';
      default: return '🍽️';
    }
  };

  const todayNutrition = nutrition.filter((entry: Nutrition) => {
    const today = new Date();
    const entryDate = new Date(entry.recorded_at);
    return entryDate.toDateString() === today.toDateString();
  });

  const totalCaloriesToday = todayNutrition.reduce((sum: number, entry: Nutrition) => 
    sum + (entry.calories || 0), 0
  );
  const totalProteinToday = todayNutrition.reduce((sum: number, entry: Nutrition) => 
    sum + (entry.protein || 0), 0
  );
  const totalCarbsToday = todayNutrition.reduce((sum: number, entry: Nutrition) => 
    sum + (entry.carbs || 0), 0
  );
  const totalFatToday = todayNutrition.reduce((sum: number, entry: Nutrition) => 
    sum + (entry.fat || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
            <Zap className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">{totalCaloriesToday}</p>
          <p className="text-xs text-green-700">Calories</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mx-auto mb-2">
            <Beef className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900">{Math.round(totalProteinToday)}g</p>
          <p className="text-xs text-red-700">Protein</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-2">
            <Apple className="h-6 w-6 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-900">{Math.round(totalCarbsToday)}g</p>
          <p className="text-xs text-yellow-700">Carbs</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2">
            <div className="text-purple-600 text-sm font-bold">FAT</div>
          </div>
          <p className="text-2xl font-bold text-purple-900">{Math.round(totalFatToday)}g</p>
          <p className="text-xs text-purple-700">Fat</p>
        </div>
      </div>

      <Separator />

      {/* Add Meal Button */}
      {!showForm && (
        <Button 
          onClick={() => setShowForm(true)}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Log Food Item
        </Button>
      )}

      {/* Nutrition Form */}
      {showForm && (
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meal Type *</Label>
                  <Select 
                    value={formData.meal_type || 'breakfast'} 
                    onValueChange={(value: 'breakfast' | 'lunch' | 'dinner' | 'snack') =>
                      setFormData((prev: CreateNutritionInput) => ({ 
                        ...prev, 
                        meal_type: value 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                      <SelectItem value="lunch">☀️ Lunch</SelectItem>
                      <SelectItem value="dinner">🌙 Dinner</SelectItem>
                      <SelectItem value="snack">🍎 Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="food_item">Food Item *</Label>
                  <Input
                    id="food_item"
                    value={formData.food_item}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateNutritionInput) => ({ 
                        ...prev, 
                        food_item: e.target.value 
                      }))
                    }
                    placeholder="e.g., Grilled Chicken"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    value={formData.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateNutritionInput) => ({ 
                        ...prev, 
                        quantity: e.target.value 
                      }))
                    }
                    placeholder="e.g., 150g, 1 cup"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={formData.calories || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateNutritionInput) => ({ 
                        ...prev, 
                        calories: parseFloat(e.target.value) || undefined 
                      }))
                    }
                    placeholder="300"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    value={formData.protein || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateNutritionInput) => ({ 
                        ...prev, 
                        protein: parseFloat(e.target.value) || undefined 
                      }))
                    }
                    placeholder="25"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    value={formData.carbs || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateNutritionInput) => ({ 
                        ...prev, 
                        carbs: parseFloat(e.target.value) || undefined 
                      }))
                    }
                    placeholder="10"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    value={formData.fat || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateNutritionInput) => ({ 
                        ...prev, 
                        fat: parseFloat(e.target.value) || undefined 
                      }))
                    }
                    placeholder="5"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateNutritionInput) => ({ 
                      ...prev, 
                      notes: e.target.value || null 
                    }))
                  }
                  placeholder="Any additional details..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Saving...' : 'Save Food Item'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent Meals */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Recent Meals</h3>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading nutrition data...</div>
        ) : nutrition.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No meals logged yet! 🍽️</p>
            <p className="text-sm mt-1">Start by adding your first meal above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nutrition.slice(0, 5).map((entry: Nutrition) => (
              <Card key={entry.id} className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getMealTypeColor(entry.meal_type)}>
                          {getMealTypeEmoji(entry.meal_type)} {entry.meal_type}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-gray-900">{entry.food_item}</h4>
                      <p className="text-sm text-gray-600">Quantity: {entry.quantity}</p>
                      
                      {(entry.protein || entry.carbs || entry.fat) && (
                        <div className="flex gap-4 mt-2 text-xs text-gray-600">
                          {entry.protein && <span>P: {entry.protein}g</span>}
                          {entry.carbs && <span>C: {entry.carbs}g</span>}
                          {entry.fat && <span>F: {entry.fat}g</span>}
                        </div>
                      )}
                      
                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-2">{entry.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {entry.calories && (
                        <div className="text-lg font-semibold text-green-900">
                          {entry.calories} cal
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {entry.recorded_at.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
