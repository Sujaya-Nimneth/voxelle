import type { ToolCall } from '@/types/types';

// ─── Tool Definitions (standard JSON Schema, with Gemini REST uppercasing helper) ───

export interface ToolSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolSchemaProperty>;
    required: string[];
  };
}

export const toolDefinitions: ToolDefinition[] = [
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
          description: 'The time of the event (e.g. "3:00 PM", "14:30", "2:00 PM")',
        },
        date: {
          type: 'string',
          description: 'The date of the event (e.g. "today", "tomorrow", "this afternoon", "2026-09-18")',
        },
        duration_minutes: {
          type: 'number',
          description: 'Optional duration of the event in minutes (defaults to 60)',
        },
      },
      required: ['title', 'time', 'date'],
    },
  },
  {
    name: 'toggle_smart_home_device',
    description:
      'Turns a smart home device on or off or adjusts its setting. Use this when the user asks to control, turn on, turn off, dim, enable, or disable a home device like lights, thermostat, fan, TV, etc.',
    parameters: {
      type: 'object',
      properties: {
        device_name: {
          type: 'string',
          description: 'The name of the device to control (e.g. "living room lights", "thermostat", "studio focus lights")',
        },
        state: {
          type: 'string',
          enum: ['on', 'off'],
          description: 'Whether to turn the device on or off',
        },
        setting: {
          type: 'string',
          description: 'Optional level, brightness, or temperature setting (e.g. "40%", "71°F")',
        },
      },
      required: ['device_name', 'state'],
    },
  },
  {
    name: 'calculate_expression',
    description:
      'Evaluates a basic arithmetic expression (+, -, *, /, %, parentheses) and returns the exact result.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The arithmetic expression to evaluate (e.g. "128.40 * 1.18 / 4")',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'get_world_time',
    description:
      'Checks the current local time and day for one or more cities or IANA time zones.',
    parameters: {
      type: 'object',
      properties: {
        locations: {
          type: 'string',
          description: 'Comma-separated city names or IANA time zones (e.g. "Tokyo, London")',
        },
      },
      required: ['locations'],
    },
  },
];

/** Gemini REST v1beta expects uppercase schema types (OBJECT, STRING, NUMBER). */
export function toGeminiToolDeclarations(defs: ToolDefinition[] = toolDefinitions) {
  return defs.map((td) => ({
    name: td.name,
    description: td.description,
    parameters: {
      type: td.parameters.type.toUpperCase(),
      properties: Object.fromEntries(
        Object.entries(td.parameters.properties).map(([key, prop]) => [
          key,
          { ...prop, type: prop.type.toUpperCase() },
        ])
      ),
      required: td.parameters.required,
    },
  }));
}

// ─── Tool Result Formatting (single source for server + client) ───

// Model-produced arguments aren't schema-validated, so coerce defensively:
// an undefined must never render as 'Scheduled "undefined"'.
function arg(value: string | number | boolean | undefined, fallback: string): string {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

// Result string shown on tool telemetry cards.
export function formatToolResult(toolCall: ToolCall): string {
  switch (toolCall.name) {
    case 'add_calendar_event': {
      const { title, time, date } = toolCall.arguments;
      return `Scheduled "${arg(title, 'untitled event')}" for ${arg(date, 'unspecified date')} at ${arg(time, 'unspecified time')}.`;
    }
    case 'toggle_smart_home_device': {
      const { device_name, state, setting } = toolCall.arguments;
      const suffix = setting !== undefined && setting !== '' ? ` (${setting})` : '';
      return `${arg(device_name, 'Device')} has been set to ${arg(state, 'the requested state')}${suffix}.`;
    }
    case 'calculate_expression': {
      const { expression } = toolCall.arguments;
      return `Calculated ${arg(expression, 'expression')}.`;
    }
    case 'get_world_time': {
      const { locations } = toolCall.arguments;
      return `Checked current time for ${arg(locations, 'requested locations')}.`;
    }
    default:
      return `Executed ${toolCall.name}`;
  }
}

// Assistant-voice narrative used when a provider emits a tool call with no
// accompanying text.
export function formatToolNarrative(toolCall: ToolCall): string {
  if (toolCall.name === 'add_calendar_event') {
    return `I've scheduled "${arg(toolCall.arguments.title, 'an event')}" for ${arg(toolCall.arguments.date, 'an unspecified date')} at ${arg(toolCall.arguments.time, 'an unspecified time')}.`;
  }
  if (toolCall.name === 'toggle_smart_home_device') {
    const setting = toolCall.arguments.setting;
    const suffix = setting !== undefined && setting !== '' ? ` (${setting})` : '';
    return `I've turned ${arg(toolCall.arguments.state, 'on')} the ${arg(toolCall.arguments.device_name, 'device')}${suffix}.`;
  }
  if (toolCall.name === 'calculate_expression') {
    return `I've calculated ${arg(toolCall.arguments.expression, 'the expression')}.`;
  }
  if (toolCall.name === 'get_world_time') {
    return `Here is the current time for ${arg(toolCall.arguments.locations, 'those locations')}.`;
  }
  return `I've executed ${toolCall.name.replace(/_/g, ' ')}.`;
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
              id: `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              status: 'executing' as const,
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
