
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Heart, ArrowRight, ArrowLeft } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput } from '../../../server/src/schema';

interface OnboardingFlowProps {
  onComplete: (user: User) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserInput>({
    name: '',
    email: '',
    age: undefined,
    gender: undefined,
    height: undefined,
    weight: undefined,
    activity_level: undefined,
    goals: null
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const user = await trpc.createUser.mutate(formData);
      
      // Mark onboarding as completed
      await trpc.updateUser.mutate({
        id: user.id,
        onboarding_completed: true
      });

      const updatedUser = await trpc.getUser.query(user.id);
      if (updatedUser) {
        onComplete(updatedUser);
      } else {
        throw new Error('Failed to fetch updated user data');
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.email;
      case 2:
        return formData.age && formData.gender;
      case 3:
        return formData.activity_level;
      case 4:
        return true; // Goals are optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-indigo-100 rounded-full w-fit">
            <Heart className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl">Welcome to WellnessTracker! 🌟</CardTitle>
          <CardDescription>
            Let's set up your personalized wellness journey
          </CardDescription>
          <Progress value={progress} className="mt-4" />
          <p className="text-xs text-gray-500 mt-2">Step {currentStep} of {totalSteps}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">About You</h3>
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ 
                      ...prev, 
                      age: parseInt(e.target.value) || undefined 
                    }))
                  }
                  placeholder="Your age"
                  min="13"
                  max="120"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select 
                  value={formData.gender || ''} 
                  onValueChange={(value: 'male' | 'female' | 'other') =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, gender: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ 
                        ...prev, 
                        height: parseFloat(e.target.value) || undefined 
                      }))
                    }
                    placeholder="170"
                    min="100"
                    max="250"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ 
                        ...prev, 
                        weight: parseFloat(e.target.value) || undefined 
                      }))
                    }
                    placeholder="70"
                    min="20"
                    max="300"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Activity Level</h3>
              <p className="text-sm text-gray-600">
                This helps us provide better recommendations
              </p>
              <div className="space-y-2">
                <Label>Current Activity Level *</Label>
                <Select 
                  value={formData.activity_level || ''} 
                  onValueChange={(value: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active') =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, activity_level: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (little/no exercise)</SelectItem>
                    <SelectItem value="lightly_active">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                    <SelectItem value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                    <SelectItem value="very_active">Very Active (hard exercise 6-7 days/week)</SelectItem>
                    <SelectItem value="extremely_active">Extremely Active (very hard exercise/training)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Wellness Goals 🎯</h3>
              <p className="text-sm text-gray-600">
                What would you like to achieve? (Optional)
              </p>
              <div className="space-y-2">
                <Label htmlFor="goals">Goals & Aspirations</Label>
                <Textarea
                  id="goals"
                  value={formData.goals || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateUserInput) => ({ 
                      ...prev, 
                      goals: e.target.value || null 
                    }))
                  }
                  placeholder="e.g., Lose weight, build muscle, improve sleep, reduce stress, run a marathon..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? 'Setting up...' : 'Complete Setup'} ✨
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
