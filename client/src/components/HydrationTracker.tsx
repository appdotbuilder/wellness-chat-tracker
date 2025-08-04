
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Droplets, Coffee, Wine } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Hydration, CreateHydrationInput } from '../../../server/src/schema';

interface HydrationTrackerProps {
  userId: number;
  onUpdate: () => void;
}

export function HydrationTracker({ userId, onUpdate }: HydrationTrackerProps) {
  const [hydration, setHydration] = useState<Hydration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<CreateHydrationInput>({
    user_id: userId,
    amount_ml: 0,
    beverage_type: undefined,
    recorded_at: undefined
  });

  const loadHydration = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getHydration.query({ userId });
      setHydration(result);
    } catch (error) {
      console.error('Failed to load hydration:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHydration();
  }, [loadHydration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount_ml <= 0) return;

    setIsSubmitting(true);
    try {
      await trpc.createHydration.mutate(formData);
      
      // Reset form
      setFormData({
        user_id: userId,
        amount_ml: 0,
        beverage_type: undefined,
        recorded_at: undefined
      });
      
      setShowForm(false);
      await loadHydration();
      onUpdate();
    } catch (error) {
      console.error('Failed to create hydration entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAddHydration = async (amount: number, beverage: string) => {
    try {
      await trpc.createHydration.mutate({
        user_id: userId,
        amount_ml: amount,
        beverage_type: beverage
      });
      
      await loadHydration();
      onUpdate();
    } catch (error) {
      console.error('Failed to add hydration:', error);
    }
  };

  const getBeverageIcon = (beverageType: string | undefined) => {
    if (!beverageType) return <Droplets className="h-4 w-4 text-blue-600" />;
    
    const type = beverageType.toLowerCase();
    if (type.includes('coffee') || type.includes('espresso')) {
      return <Coffee className="h-4 w-4 text-brown-600" />;
    }
    if (type.includes('tea')) {
      return <Coffee className="h-4 w-4 text-green-600" />;
    }
    if (type.includes('wine') || type.includes('beer') || type.includes('alcohol')) {
      return <Wine className="h-4 w-4 text-purple-600" />;
    }
    return <Droplets className="h-4 w-4 text-blue-600" />;
  };

  const todayHydration = hydration.filter((entry: Hydration) => {
    const today = new Date();
    const entryDate = new Date(entry.recorded_at);
    return entryDate.toDateString() === today.toDateString();
  });

  const totalMlToday = todayHydration.reduce((sum: number, entry: Hydration) => 
    sum + entry.amount_ml, 0
  );

  const dailyGoal = 2000; // 2L daily goal
  const progressPercentage = Math.min((totalMlToday / dailyGoal) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Hydration Progress */}
      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="#e5f3ff"
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="#3b82f6"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={`${(progressPercentage / 100) * 339.29} 339.29`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Droplets className="h-8 w-8 text-blue-600 mb-1" />
            <div className="text-2xl font-bold text-blue-900">
              {(totalMlToday / 1000).toFixed(1)}L
            </div>
            <div className="text-xs text-blue-700">
              of {dailyGoal / 1000}L goal
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          {todayHydration.length} drinks logged today
        </p>
      </div>

      <Separator />

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="outline"
          onClick={() => quickAddHydration(250, 'water')}
          className="flex flex-col h-auto py-3 border-blue-200 hover:bg-blue-50"
        >
          <Droplets className="h-6 w-6 text-blue-600 mb-1" />
          <span className="text-xs">Glass</span>
          <span className="text-xs text-gray-500">250ml</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => quickAddHydration(500, 'water')}
          className="flex flex-col h-auto py-3 border-blue-200 hover:bg-blue-50"
        >
          <Droplets className="h-6 w-6 text-blue-600 mb-1" />
          <span className="text-xs">Bottle</span>
          <span className="text-xs text-gray-500">500ml</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => quickAddHydration(200, 'coffee')}
          className="flex flex-col h-auto py-3 border-amber-200 hover:bg-amber-50"
        >
          <Coffee className="h-6 w-6 text-amber-600 mb-1" />
          <span className="text-xs">Coffee</span>
          <span className="text-xs text-gray-500">200ml</span>
        </Button>
      </div>

      {/* Custom Add Button */}
      {!showForm && (
        <Button 
          onClick={() => setShowForm(true)}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Drink
        </Button>
      )}

      {/* Custom Form */}
      {showForm && (
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (ml) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount_ml || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateHydrationInput) => ({ 
                        ...prev, 
                        amount_ml: parseInt(e.target.value) || 0 
                      }))
                    }
                    placeholder="250"
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beverage_type">Beverage Type</Label>
                  <Input
                    id="beverage_type"
                    value={formData.beverage_type || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateHydrationInput) => ({ 
                        ...prev, 
                        beverage_type: e.target.value || undefined 
                      }))
                    }
                    placeholder="e.g., Water, Tea, Coffee"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? 'Adding...' : 'Add Drink'}
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

      {/* Recent Hydration */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Recent Hydration</h3>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading hydration data...</div>
        ) : hydration.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No drinks logged yet! 💧</p>
            <p className="text-sm mt-1">Start by adding your first drink above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hydration.slice(0, 8).map((entry: Hydration) => (
              <Card key={entry.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {getBeverageIcon(entry.beverage_type)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {entry.beverage_type || 'Water'}
                        </p>
                        <p className="text-sm text-gray-600">{entry.amount_ml}ml</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {entry.recorded_at.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
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
