import { ToolCall } from '@/types/types';

// ─── Tool Definitions (compatible with Gemini function calling format) ───

export const toolDefinitions = [
  {
    name: 'add_calendar_event',
    description:
      'Adds a new event to the user\'s calendar. Use this when the user asks to schedule, book, or add a meeting, appointment, reminder, or any calendar event.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title or name of the event',
        },
        time: {
          type: 'string',
          description: 'The time of the event (e.g. "3:00 PM", "14:30")',
        },
        date: {
          type: 'string',
          description: 'The date of the event (e.g. "2024-12-25", "tomorrow", "next Monday")',
        },
      },
      required: ['title', 'time', 'date'],
    },
  },
  {
    name: 'toggle_smart_home_device',
    description:
      'Turns a smart home device on or off. Use this when the user asks to control, turn on, turn off, enable, or disable a home device like lights, thermostat, fan, TV, etc.',
    parameters: {
      type: 'object',
      properties: {
        device_name: {
          type: 'string',
          description: 'The name of the device to control (e.g. "living room lights", "thermostat", "bedroom fan")',
        },
        state: {
          type: 'string',
          enum: ['on', 'off'],
          description: 'Whether to turn the device on or off',
        },
      },
      required: ['device_name', 'state'],
    },
  },
];

// ─── Mock Tool Execution ───

export function executeToolCall(toolCall: ToolCall): string {
  switch (toolCall.name) {
    case 'add_calendar_event': {
      const { title, time, date } = toolCall.arguments;
      return `✅ Event "${title}" has been scheduled for ${date} at ${time}.`;
    }
    case 'toggle_smart_home_device': {
      const { device_name, state } = toolCall.arguments;
      return `✅ ${device_name} has been turned ${state}.`;
    }
    default:
      return `⚠️ Unknown tool: ${toolCall.name}`;
  }
}

// ─── Mock Responses (for demo mode without an API key) ───

interface MockScenario {
  keywords: string[];
  response: string;
  toolCall?: Omit<ToolCall, 'id' | 'status'>;
}

const mockScenarios: MockScenario[] = [
  {
    keywords: ['schedule', 'meeting', 'appointment', 'book', 'calendar', 'remind'],
    response: 'I\'ve scheduled that for you. The event has been added to your calendar.',
    toolCall: {
      name: 'add_calendar_event',
      arguments: {
        title: 'Team Meeting',
        time: '3:00 PM',
        date: 'Tomorrow',
      },
    },
  },
  {
    keywords: ['light', 'lights', 'lamp'],
    response: 'Done! I\'ve toggled the lights for you.',
    toolCall: {
      name: 'toggle_smart_home_device',
      arguments: {
        device_name: 'Living Room Lights',
        state: 'on',
      },
    },
  },
  {
    keywords: ['fan', 'ac', 'air conditioner', 'thermostat', 'temperature', 'heater'],
    response: 'I\'ve adjusted your climate control. Let me know if you need anything else.',
    toolCall: {
      name: 'toggle_smart_home_device',
      arguments: {
        device_name: 'Thermostat',
        state: 'on',
      },
    },
  },
  {
    keywords: ['tv', 'television', 'screen'],
    response: 'Your TV is now toggled. Enjoy!',
    toolCall: {
      name: 'toggle_smart_home_device',
      arguments: {
        device_name: 'Living Room TV',
        state: 'on',
      },
    },
  },
];

const genericResponses = [
  "I'm Voxelle, your multimodal AI assistant. I can help you schedule events, control smart home devices, and analyze images. What would you like to do?",
  "That's an interesting thought! While I'm running in demo mode, I can show you how I handle calendar scheduling and smart home controls. Try asking me to schedule a meeting or turn on the lights!",
  "I'd be happy to help with that. In my full configuration with a Gemini API key, I can provide much more detailed responses. For now, try asking me to control a smart device or add a calendar event!",
  "Great question! I'm currently running without an API key, so I'm giving demo responses. You can add a GEMINI_API_KEY in your .env.local to unlock full AI capabilities, including image analysis!",
  "Hello! I'm Voxelle, your voice-enabled assistant. Try saying something like 'Schedule a meeting tomorrow at 3pm' or 'Turn on the living room lights' to see me in action!",
];

export function getMockResponse(userMessage: string): {
  response: string;
  toolCalls?: ToolCall[];
} {
  const lowerMessage = userMessage.toLowerCase();

  // Check for keyword matches
  for (const scenario of mockScenarios) {
    if (scenario.keywords.some((kw) => lowerMessage.includes(kw))) {
      const toolCalls: ToolCall[] | undefined = scenario.toolCall
        ? [
            {
              ...scenario.toolCall,
              id: `tool_${Date.now()}`,
              status: 'pending' as const,
            },
          ]
        : undefined;

      return {
        response: scenario.response,
        toolCalls,
      };
    }
  }

  // Return a random generic response
  const randomIndex = Math.floor(Math.random() * genericResponses.length);
  return { response: genericResponses[randomIndex] };
}
