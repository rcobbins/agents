import React from 'react';
import { Box } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

interface Step {
  label: string;
  id: string;
}

interface CustomStepperProps {
  steps: Step[];
  activeStep: number;
  isStepCompleted: (stepId: string) => boolean;
  onStepClick: (stepIndex: number) => void;
}

const CustomStepper: React.FC<CustomStepperProps> = ({
  steps,
  activeStep,
  isStepCompleted,
  onStepClick,
}) => {
  // Calculate dynamic spacing based on number of steps
  const stepWidth = 100 / steps.length;
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 90,
        minHeight: 90,
        px: 2,
        py: 1,
        overflow: 'visible',
      }}
    >
      {/* Connection line behind all steps */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: '45px', sm: '45px', md: '45px' },
          left: `${stepWidth / 2}%`,
          right: `${stepWidth / 2}%`,
          height: 2,
          bgcolor: 'divider',
          zIndex: 0,
        }}
      />
      
      {/* Progress line */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: '45px', sm: '45px', md: '45px' },
          left: `${stepWidth / 2}%`,
          width: `${(activeStep / (steps.length - 1)) * (100 - stepWidth)}%`,
          height: 2,
          bgcolor: 'primary.main',
          zIndex: 1,
          transition: 'width 0.3s ease',
        }}
      />
      
      {/* Steps */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          height: '100%',
          zIndex: 2,
        }}
      >
        {steps.map((step, index) => {
          const isCompleted = isStepCompleted(step.id) && index < activeStep;
          const isActive = index === activeStep;
          
          return (
            <Box
              key={step.id}
              onClick={() => onStepClick(index)}
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: `${stepWidth}%`,
                minWidth: 0,
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {/* Step label positioned above with special alignment */}
              <Box
                sx={{
                  position: 'absolute',
                  top: { xs: '23px', sm: '13px', md: '11px' },
                  left: '50%',
                  transform: 'translateX(calc(-50% - 22px))',
                  width: 'max-content',
                  maxWidth: { xs: '60px', sm: '80px', md: '100px' },
                  display: { xs: 'none', sm: 'block' }, // Hide on mobile
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#90caf9' : isCompleted ? '#66bb6a' : 'rgba(255, 255, 255, 0.7)',
                    textAlign: 'right',
                    lineHeight: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.3s ease',
                    display: 'block',
                  }}
                  title={step.label}
                >
                  {step.label}
                </span>
              </Box>
              
              {/* Step icon */}
              <Box
                sx={{
                  position: 'absolute',
                  top: { xs: '31px', sm: '25px', md: '23px' },
                  width: { xs: 28, sm: 40, md: 44 },
                  height: { xs: 28, sm: 40, md: 44 },
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isActive 
                    ? 'primary.main' 
                    : isCompleted 
                      ? 'success.main' 
                      : 'grey.300',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: { xs: '12px', sm: '18px', md: '20px' },
                  transition: 'all 0.3s ease',
                  border: isActive ? '2px solid' : 'none',
                  borderColor: isActive ? 'primary.light' : 'transparent',
                  boxShadow: isActive 
                    ? '0 0 0 4px rgba(25, 118, 210, 0.12)' 
                    : 'none',
                }}
              >
                {isCompleted ? (
                  <CheckCircle sx={{ fontSize: { xs: 20, sm: 28, md: 32 } }} />
                ) : (
                  index + 1
                )}
              </Box>
              
              {/* Mobile step number below icon (only on very small screens) */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  display: { xs: 'block', sm: 'none' },
                }}
              >
                <span
                  style={{
                    fontSize: '9px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  {index + 1}/{steps.length}
                </span>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default CustomStepper;