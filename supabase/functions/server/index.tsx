import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();
const BASE_PATH = "/make-server-7819cca2";

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.use('*', logger(console.log));

app.options('*', (c) => {
  return c.text('', 204);
});

app.get(`${BASE_PATH}/health`, (c) => {
  return c.json({ status: "ok" });
});

app.onError((err, c) => {
  console.error(`Server Error [${c.req.method} ${c.req.url}]:`, err);
  return c.json({ error: err.message || "Internal Server Error" }, 500);
});

// --- AUTH ---
app.post(`${BASE_PATH}/signup`, async (c) => {
  const { email, password, name, role } = await c.req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Create Auth User
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name, role },
    email_confirm: true
  });

  if (error) {
    // Suppress logging for known duplicate email error to keep logs clean
    if (error.message && !error.message.includes('already been registered')) {
        console.error("Auth error:", error);
    }
    return c.json({ error: error.message }, 400);
  }

  // 2. Create Profile in KV
  if (data.user) {
     const newUser = {
        id: data.user.id,
        name,
        role,
        status: name.toLowerCase() === 'iisa' ? 'active' : 'pending',
        coachId: ''
     };
     await kv.set(`user:${data.user.id}`, newUser);
     return c.json({ user: newUser });
  }
  return c.json({ error: "Failed to create user" }, 500);
});

app.post(`${BASE_PATH}/update-account`, async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "No token provided" }, 401);
  const token = authHeader.split(" ")[1];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify User
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const updates: any = {};
  if (body.email) updates.email = body.email;
  if (body.password) updates.password = body.password;

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      updates
    );
    if (updateError) return c.json({ error: updateError.message }, 400);
  }

  return c.json({ success: true });
});

// --- USERS ---
app.get(`${BASE_PATH}/users`, async (c) => {
  const users = await kv.getByPrefix("user:");
  return c.json(users);
});

app.get(`${BASE_PATH}/users/:id`, async (c) => {
  const id = c.req.param("id");
  const user = await kv.get(`user:${id}`);
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json(user);
});

app.post(`${BASE_PATH}/users`, async (c) => {
  const body = await c.req.json();
  const id = body.id;
  if (!id) return c.json({ error: "Missing ID" }, 400);
  await kv.set(`user:${id}`, body);
  return c.json({ success: true, user: body });
});

app.delete(`${BASE_PATH}/users/:id`, async (c) => {
  const id = c.req.param("id");
  
  // Initialize Supabase Admin Client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Delete from Auth (Supabase Database)
  const { error } = await supabase.auth.admin.deleteUser(id);
  
  if (error) {
    console.error(`Failed to delete user ${id} from Auth:`, error);
    // Continue to delete from KV even if Auth delete fails (or maybe user is already gone from Auth)
  } else {
    console.log(`User ${id} deleted from Auth`);
  }

  // 2. Delete from KV Store (App Database)
  await kv.del(`user:${id}`);
  
  return c.json({ success: true });
});

// --- LOGS ---
app.get(`${BASE_PATH}/logs`, async (c) => {
  const logs = await kv.getByPrefix("log:");
  // Sort by date desc (newest first)
  logs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return c.json(logs);
});

app.post(`${BASE_PATH}/logs`, async (c) => {
  const body = await c.req.json();
  const id = body.id || Date.now().toString();
  await kv.set(`log:${id}`, { ...body, id });
  return c.json({ success: true, log: { ...body, id } });
});

app.put(`${BASE_PATH}/logs/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await kv.get(`log:${id}`);
  if (!existing) return c.json({ error: "Log not found" }, 404);
  const updated = { ...existing, ...body };
  await kv.set(`log:${id}`, updated);
  return c.json({ success: true, log: updated });
});

app.delete(`${BASE_PATH}/logs/:id`, async (c) => {
  const id = c.req.param("id");
  await kv.del(`log:${id}`);
  return c.json({ success: true });
});

// --- EXERCISES ---
app.get(`${BASE_PATH}/exercises`, async (c) => {
  try {
    const exercises = await kv.getByPrefix("exercise:");
    return c.json(exercises);
  } catch (err: any) {
    console.error("KV Error fetching exercises:", err);
    return c.json({ error: "Failed to fetch exercises", details: err.message }, 500);
  }
});

app.post(`${BASE_PATH}/exercises`, async (c) => {
  const body = await c.req.json();
  const id = body.id || Date.now().toString();
  await kv.set(`exercise:${id}`, { ...body, id });
  return c.json({ success: true, exercise: { ...body, id } });
});

app.delete(`${BASE_PATH}/exercises/:id`, async (c) => {
  const id = c.req.param("id");
  await kv.del(`exercise:${id}`);
  return c.json({ success: true });
});

// --- BATTLES ---
app.get(`${BASE_PATH}/battles`, async (c) => {
  const battles = await kv.getByPrefix("battle:");
  return c.json(battles);
});

app.post(`${BASE_PATH}/battles`, async (c) => {
  const body = await c.req.json();
  const id = body.id || Date.now().toString();
  await kv.set(`battle:${id}`, { ...body, id });
  return c.json({ success: true, battle: { ...body, id } });
});

app.delete(`${BASE_PATH}/battles/:id`, async (c) => {
  const id = c.req.param("id");
  await kv.del(`battle:${id}`);
  return c.json({ success: true });
});

app.post(`${BASE_PATH}/battles/:id/like`, async (c) => {
  const id = c.req.param("id");
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "No token provided" }, 401);
  const token = authHeader.split(" ")[1];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const battle = await kv.get(`battle:${id}`);
  if (battle) {
    battle.likedBy = battle.likedBy || [];
    const index = battle.likedBy.indexOf(user.id);
    
    if (index === -1) {
      // Like
      battle.likedBy.push(user.id);
      battle.likes = (battle.likes || 0) + 1;
    } else {
      // Unlike
      battle.likedBy.splice(index, 1);
      battle.likes = Math.max(0, (battle.likes || 0) - 1);
    }
    
    await kv.set(`battle:${id}`, battle);
    return c.json({ success: true, battle });
  }
  return c.json({ error: "Battle not found" }, 404);
});

app.post(`${BASE_PATH}/battles/:id/comments`, async (c) => {
  const id = c.req.param("id");
  const { author, content } = await c.req.json();
  const battle = await kv.get(`battle:${id}`);
  
  if (battle) {
    const newComment = {
      id: Date.now().toString(),
      author,
      content,
      date: new Date().toISOString()
    };
    
    battle.comments = [...(battle.comments || []), newComment];
    await kv.set(`battle:${id}`, battle);
    return c.json({ success: true, battle });
  }
  return c.json({ error: "Battle not found" }, 404);
});

app.post(`${BASE_PATH}/battles/:id/records`, async (c) => {
  const id = c.req.param("id");
  const { studentId, studentName, content } = await c.req.json();
  const battle = await kv.get(`battle:${id}`);
  
  if (battle) {
    const newRecord = {
      id: Date.now().toString(),
      studentId,
      studentName,
      content,
      completedAt: new Date().toISOString()
    };
    
    const records = battle.records || [];
    const existingIndex = records.findIndex((r: any) => r.studentId === studentId);
    
    if (existingIndex >= 0) {
       records[existingIndex] = newRecord;
    } else {
       records.push(newRecord);
    }

    battle.records = records;
    await kv.set(`battle:${id}`, battle);
    return c.json({ success: true, battle });
  }
  return c.json({ error: "Battle not found" }, 404);
});

// --- UPLOAD ---
app.post(`${BASE_PATH}/upload`, async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const bucketName = "make-7819cca2-exercises";

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName);
  }

  // Upload file
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return c.json({ error: "Failed to upload file" }, 500);
  }

  // Create Signed URL (valid for 10 years approx)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, 315360000); // 10 years in seconds

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error("Signed URL error:", signedUrlError);
    return c.json({ error: "Failed to generate URL" }, 500);
  }

  return c.json({ url: signedUrlData.signedUrl });
});

Deno.serve(app.fetch);
