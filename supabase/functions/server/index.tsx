import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-c6398202/health", (c) => {
  return c.json({ status: "ok" });
});

// Authentication middleware
const requireAuth = async (c: any, next: any) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_ANON_KEY') || '',
  );

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user?.id) {
    console.log('Authorization error during auth check:', error);
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }

  c.set('userId', user.id);
  c.set('user', user);
  await next();
};

// Sign up endpoint
app.post("/make-server-c6398202/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log('Unexpected error during signup:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// User data endpoints
app.get("/make-server-c6398202/user/profile", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const profile = await kv.get(`user:${userId}:profile`);
    return c.json({ profile: profile || {} });
  } catch (error) {
    console.log('Error fetching user profile:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

app.post("/make-server-c6398202/user/profile", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const profileData = await c.req.json();
    await kv.set(`user:${userId}:profile`, profileData);
    return c.json({ success: true, profile: profileData });
  } catch (error) {
    console.log('Error updating user profile:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Courses endpoints
app.get("/make-server-c6398202/courses", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const courses = await kv.getByPrefix(`user:${userId}:course:`);
    return c.json({ courses: courses || [] });
  } catch (error) {
    console.log('Error fetching courses:', error);
    return c.json({ error: 'Failed to fetch courses' }, 500);
  }
});

app.post("/make-server-c6398202/courses", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const courseData = await c.req.json();
    const courseId = courseData.id || Date.now().toString();
    await kv.set(`user:${userId}:course:${courseId}`, { ...courseData, id: courseId });
    return c.json({ success: true, course: { ...courseData, id: courseId } });
  } catch (error) {
    console.log('Error creating course:', error);
    return c.json({ error: 'Failed to create course' }, 500);
  }
});

app.put("/make-server-c6398202/courses/:id", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const courseId = c.req.param('id');
    const courseData = await c.req.json();
    await kv.set(`user:${userId}:course:${courseId}`, { ...courseData, id: courseId });
    return c.json({ success: true, course: { ...courseData, id: courseId } });
  } catch (error) {
    console.log('Error updating course:', error);
    return c.json({ error: 'Failed to update course' }, 500);
  }
});

app.delete("/make-server-c6398202/courses/:id", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const courseId = c.req.param('id');
    await kv.del(`user:${userId}:course:${courseId}`);
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting course:', error);
    return c.json({ error: 'Failed to delete course' }, 500);
  }
});

// Tests endpoints
app.get("/make-server-c6398202/tests", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const tests = await kv.getByPrefix(`user:${userId}:test:`);
    return c.json({ tests: tests || [] });
  } catch (error) {
    console.log('Error fetching tests:', error);
    return c.json({ error: 'Failed to fetch tests' }, 500);
  }
});

app.post("/make-server-c6398202/tests", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const testData = await c.req.json();
    const testId = testData.id || Date.now().toString();
    await kv.set(`user:${userId}:test:${testId}`, { ...testData, id: testId });
    return c.json({ success: true, test: { ...testData, id: testId } });
  } catch (error) {
    console.log('Error creating test:', error);
    return c.json({ error: 'Failed to create test' }, 500);
  }
});

// Schedule/Events endpoints
app.get("/make-server-c6398202/events", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const events = await kv.getByPrefix(`user:${userId}:event:`);
    return c.json({ events: events || [] });
  } catch (error) {
    console.log('Error fetching events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

app.post("/make-server-c6398202/events", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const eventData = await c.req.json();
    const eventId = eventData.id || Date.now().toString();
    await kv.set(`user:${userId}:event:${eventId}`, { ...eventData, id: eventId });
    return c.json({ success: true, event: { ...eventData, id: eventId } });
  } catch (error) {
    console.log('Error creating event:', error);
    return c.json({ error: 'Failed to create event' }, 500);
  }
});

app.delete("/make-server-c6398202/events/:id", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const eventId = c.req.param('id');
    await kv.del(`user:${userId}:event:${eventId}`);
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting event:', error);
    return c.json({ error: 'Failed to delete event' }, 500);
  }
});

// AI Chat endpoints
app.post("/make-server-c6398202/ai/chat", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { message } = await c.req.json();

    // Store chat message
    const messageId = Date.now().toString();
    await kv.set(`user:${userId}:chat:${messageId}`, {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Get AI response (this would connect to your local AI model)
    const response = getLocalAIResponse(message);

    const responseId = (Date.now() + 1).toString();
    await kv.set(`user:${userId}:chat:${responseId}`, {
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    });

    return c.json({ response });
  } catch (error) {
    console.log('Error in AI chat:', error);
    return c.json({ error: 'Failed to process AI chat' }, 500);
  }
});

app.get("/make-server-c6398202/ai/chat/history", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const messages = await kv.getByPrefix(`user:${userId}:chat:`);
    return c.json({ messages: messages || [] });
  } catch (error) {
    console.log('Error fetching chat history:', error);
    return c.json({ error: 'Failed to fetch chat history' }, 500);
  }
});

// Dashboard/Analytics endpoint
app.get("/make-server-c6398202/analytics", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const analytics = await kv.get(`user:${userId}:analytics`);
    return c.json({ analytics: analytics || {} });
  } catch (error) {
    console.log('Error fetching analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

app.post("/make-server-c6398202/analytics", requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const analyticsData = await c.req.json();
    await kv.set(`user:${userId}:analytics`, analyticsData);
    return c.json({ success: true });
  } catch (error) {
    console.log('Error updating analytics:', error);
    return c.json({ error: 'Failed to update analytics' }, 500);
  }
});

// Helper function for local AI responses
function getLocalAIResponse(query: string): string {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('study plan') || lowerQuery.includes('schedule')) {
    return 'Based on your current progress and upcoming exams, I recommend:\n\n1. Math (Calculus): 2 hours daily - Focus on practice problems\n2. Science: 1.5 hours daily - Review lab concepts\n3. English: 1 hour daily - Literature analysis\n\nYour optimal study time appears to be 4-6 PM based on your past performance data.';
  }

  if (lowerQuery.includes('weak') || lowerQuery.includes('improve')) {
    return 'Analyzing your test results, here are areas that need attention:\n\n• English Literature Analysis - 68% average\n• Physics Mechanics - 72% average\n• Math Trigonometry - 75% average\n\nI suggest dedicating 30 extra minutes daily to your weakest subject and using practice tests to reinforce concepts.';
  }

  if (lowerQuery.includes('calculus') || lowerQuery.includes('derivative')) {
    return 'Calculus derivatives represent the rate of change. Here\'s a simple explanation:\n\nIf f(x) = x², then f\'(x) = 2x\n\nThis means at any point x, the slope of the curve is 2x. For example:\n• At x = 3, slope = 2(3) = 6\n• At x = 5, slope = 2(5) = 10\n\nWould you like me to explain specific derivative rules?';
  }

  return `I understand you're asking about "${query}". As a local AI assistant, I can:\n\n• Provide study recommendations based on your data\n• Explain academic concepts\n• Create personalized study schedules\n• Analyze your performance patterns\n• Answer subject-specific questions\n\nCould you provide more details about what you'd like to know?`;
}

Deno.serve(app.fetch);