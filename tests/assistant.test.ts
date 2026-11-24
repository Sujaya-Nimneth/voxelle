import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  getMockResponse,
  toolDefinitions,
  toGeminiToolDeclarations,
  formatToolResult,
  formatToolNarrative,
} from '../src/lib/tools.ts';

describe('Voxelle Assistant Tools & Mock Engine', () => {
  test('toolDefinitions contains all 4 server-executed tool specifications with lowercase JSON schema types', () => {
    assert.strictEqual(toolDefinitions.length, 4);
    const names = toolDefinitions.map((t) => t.name);
    assert.ok(names.includes('add_calendar_event'));
    assert.ok(names.includes('toggle_smart_home_device'));
    assert.ok(names.includes('calculate_expression'));
    assert.ok(names.includes('get_world_time'));

    for (const def of toolDefinitions) {
      assert.strictEqual(def.parameters.type, 'object');
      for (const prop of Object.values(def.parameters.properties)) {
        assert.strictEqual(prop.type, prop.type.toLowerCase());
      }
    }
  });

  test('toGeminiToolDeclarations uppercases schema types for Gemini REST API', () => {
    const geminiDefs = toGeminiToolDeclarations();
    assert.strictEqual(geminiDefs.length, 4);
    assert.strictEqual(geminiDefs[0].parameters.type, 'OBJECT');
    assert.strictEqual(geminiDefs[0].parameters.properties.title.type, 'STRING');
    assert.strictEqual(geminiDefs[0].parameters.properties.duration_minutes.type, 'NUMBER');
  });

  test('calendar tool definition has required properties', () => {
    const calendarDef = toolDefinitions.find((t) => t.name === 'add_calendar_event');
    assert.ok(calendarDef);
    assert.deepStrictEqual(calendarDef.parameters.required, ['title', 'time', 'date']);
  });

  test('smart home tool definition has device_name and state properties', () => {
    const homeDef = toolDefinitions.find((t) => t.name === 'toggle_smart_home_device');
    assert.ok(homeDef);
    assert.deepStrictEqual(homeDef.parameters.required, ['device_name', 'state']);
  });

  test('getMockResponse triggers calendar tool call on scheduling keywords', () => {
    const res = getMockResponse('Please schedule a sync meeting tomorrow at 3 PM');
    assert.ok(res.response);
    assert.ok(res.toolCalls && res.toolCalls.length > 0);
    assert.strictEqual(res.toolCalls[0].name, 'add_calendar_event');
  });

  test('getMockResponse triggers smart home tool call on lights keyword', () => {
    const res = getMockResponse('Turn on the living room lights');
    assert.ok(res.response);
    assert.ok(res.toolCalls && res.toolCalls.length > 0);
    assert.strictEqual(res.toolCalls[0].name, 'toggle_smart_home_device');
  });

  test('getMockResponse is case-insensitive', () => {
    const res = getMockResponse('PLEASE PLAN MY AFTERNOON');
    assert.ok(res.response);
    assert.ok(res.toolCalls && res.toolCalls.length > 0);
    assert.strictEqual(res.toolCalls[0].name, 'add_calendar_event');
  });

  test('getMockResponse returns generic conversational response when no keyword matches', () => {
    const res = getMockResponse('random conversational query 12345');
    assert.ok(res.response);
    assert.strictEqual(res.toolCalls, undefined);
  });

  test('formatToolResult formats readable action string for calendar', () => {
    const result = formatToolResult({
      id: 'test_1',
      name: 'add_calendar_event',
      arguments: {
        title: 'Project Standup',
        time: '10:00 AM',
        date: 'Today',
      },
      status: 'completed',
    });
    assert.strictEqual(result, 'Scheduled "Project Standup" for Today at 10:00 AM.');
  });

  test('formatToolResult formats readable action string for smart home', () => {
    const result = formatToolResult({
      id: 'test_2',
      name: 'toggle_smart_home_device',
      arguments: {
        device_name: 'Studio Desk Lamp',
        state: 'on',
      },
      status: 'completed',
    });
    assert.strictEqual(result, 'Studio Desk Lamp has been set to on.');
  });

  test('formatToolResult handles unknown tool gracefully', () => {
    const result = formatToolResult({
      id: 'test_3',
      name: 'custom_workspace_action',
      arguments: {},
      status: 'completed',
    });
    assert.strictEqual(result, 'Executed custom_workspace_action');
  });

  test('formatToolResult never renders undefined for missing args', () => {
    const result = formatToolResult({
      id: 'test_4',
      name: 'add_calendar_event',
      arguments: {},
      status: 'completed',
    });
    assert.ok(!result.includes('undefined'));
  });

  test('formatToolNarrative speaks in assistant voice without undefined args', () => {
    const narrative = formatToolNarrative({
      id: 'test_5',
      name: 'toggle_smart_home_device',
      arguments: { state: 'off' },
      status: 'executing',
    });
    assert.ok(narrative.startsWith("I've turned"));
    assert.ok(!narrative.includes('undefined'));
  });

  test('all 4 ChatLog starter prompts resolve to real tool calls in Demo Mode', () => {
    const cal = getMockResponse('Schedule a team sync tomorrow at 10:00 AM for 30 minutes');
    assert.strictEqual(cal.toolCalls?.[0]?.name, 'add_calendar_event');
    assert.strictEqual(cal.toolCalls?.[0]?.arguments.title, 'Team sync');
    assert.strictEqual(cal.toolCalls?.[0]?.arguments.duration_minutes, 30);
    assert.strictEqual(cal.toolCalls?.[0]?.arguments.time, '10:00 AM');

    const home = getMockResponse('Set the living room lights to 40%');
    assert.strictEqual(home.toolCalls?.[0]?.name, 'toggle_smart_home_device');
    assert.strictEqual(home.toolCalls?.[0]?.arguments.state, 'on');
    assert.strictEqual(home.toolCalls?.[0]?.arguments.setting, '40%');

    const math = getMockResponse('Calculate 128.40 * 1.18 / 4');
    assert.strictEqual(math.toolCalls?.[0]?.name, 'calculate_expression');
    assert.strictEqual(math.toolCalls?.[0]?.arguments.expression, '128.40 * 1.18 / 4');

    const clock = getMockResponse('What time is it right now in Tokyo and London?');
    assert.strictEqual(clock.toolCalls?.[0]?.name, 'get_world_time');
    assert.strictEqual(clock.toolCalls?.[0]?.arguments.locations, 'Tokyo and London');
  });
});
