import { ToolCall } from '@/types/types';

// ─── Tool Definitions (compatible with Gemini & OpenAI function calling formats) ───

export const toolDefinitions = [
  {
    name: 'add_calendar_event',
    description:
      'Adds a new event to the user\'s calendar. Use this when the user asks to schedule, book, or add a meeting, appointment, reminder, or any calendar event.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'The title or name of the event',
        },
        time: {
          type: 'STRING',
          description: 'The time of the event (e.g. "3:00 PM", "14:30", "2:00 PM")',
        },
        date: {
          type: 'STRING',
          description: 'The date of the event (e.g. "today", "tomorrow", "this afternoon", "2026-09-18")',
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
      type: 'OBJECT',
      properties: {
        device_name: {
          type: 'STRING',
          description: 'The name of the device to control (e.g. "living room lights", "thermostat", "studio focus lights")',
        },
        state: {
          type: 'STRING',
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
      return `Scheduled "${title}" for ${date} at ${time}.`;
    }
    case 'toggle_smart_home_device': {
      const { device_name, state } = toolCall.arguments;
      return `${device_name} has been set to ${state}.`;
    }
    default:
      return `Executed ${toolCall.name}`;
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
    keywords: ['plan my afternoon', 'afternoon', 'plan afternoon'],
    response: 'I\'ve organized your afternoon. I blocked out 90 minutes of dedicated focus time and lined up your high-priority items.',
    toolCall: {
      name: 'add_calendar_event',
      arguments: {
        title: 'Deep Work: Core Architecture',
        time: '2:00 PM',
        date: 'This afternoon',
      },
    },
  },
  {
    keywords: ['brief me on today', 'brief me', 'today briefing', 'morning brief'],
    response: 'Good morning! All 8 workspace integrations are synced. You have 2 calendar events scheduled, no pending system alerts, and your smart workspace is running on optimal settings.',
    toolCall: {
      name: 'add_calendar_event',
      arguments: {
        title: 'Workspace Review Sync',
        time: '11:00 AM',
        date: 'Today',
      },
    },
  },
  {
    keywords: ['prepare for a meeting', 'meeting prep', 'prepare meeting'],
    response: 'I\'ve prepared your briefing pack for the upcoming meeting and allocated a 15-minute preparation window on your schedule.',
    toolCall: {
      name: 'add_calendar_event',
      arguments: {
        title: 'Meeting Preparation Window',
        time: '3:45 PM',
        date: 'Today',
      },
    },
  },
  {
    keywords: ['focus routine', 'focus mode'],
    response: 'Focus routine initiated. Studio lights have been dialed to cyber focus tint and notifications are silenced.',
    toolCall: {
      name: 'toggle_smart_home_device',
      arguments: {
        device_name: 'Studio Focus Lights',
        state: 'on',
      },
    },
  },
  {
    keywords: ['evening scene', 'evening', 'night mode'],
    response: 'Evening scene enabled. Ambient mood lighting engaged and climate set to comfortable evening levels.',
    toolCall: {
      name: 'toggle_smart_home_device',
      arguments: {
        device_name: 'Living Room Ambient Lights',
        state: 'on',
      },
    },
  },
  {
    keywords: ['timesfm', 'research briefing: timesfm'],
    response: 'TimesFM (Time-Series Foundation Model) by Google Research is a pretrained decoder-only foundation model engineered for zero-shot time-series forecasting. It delivers state-of-the-art predictive accuracy across enterprise and scientific domains.',
  },
  {
    keywords: ['schedule', 'meeting', 'appointment', 'book', 'calendar', 'remind'],
    response: 'I\'ve scheduled that for you. The event has been confirmed and synced to your calendar.',
    toolCall: {
      name: 'add_calendar_event',
      arguments: {
        title: 'Project Synchronization',
        time: '3:00 PM',
        date: 'Tomorrow',
      },
    },
  },
  {
    keywords: ['light', 'lights', 'lamp'],
    response: 'Done! I\'ve adjusted the lighting for your workspace.',
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
    response: 'Climate control updated. Setting temperature to 71°F.',
    toolCall: {
      name: 'toggle_smart_home_device',
      arguments: {
        device_name: 'Workspace Thermostat',
        state: 'on',
      },
    },
  },
];

const genericResponses = [
  "I'm Voxelle, your ambient AI co-pilot. I can coordinate calendar events, automations, smart devices, and multimodal image analysis. What would you like to put in motion?",
  "Workspace connected and ready. Try asking me to plan your afternoon, brief you on today, or toggle your connected tools.",
  "Understood. All workspace telemetry is active and encrypted. You can interact by typing or tapping the voice microphone.",
  "I'm monitoring your workspace signals. Let me know if you'd like to schedule events or adjust your connected environment.",
];

export function getMockResponse(userMessage: string): {
  response: string;
  toolCalls?: ToolCall[];
} {
  const lowerMessage = userMessage.toLowerCase().trim();

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

  const randomIndex = Math.floor(Math.random() * genericResponses.length);
  return { response: genericResponses[randomIndex] };
}
