function getFilteredPosts() {
  const selectedPlatform =
    document.getElementById("platformFilter")?.value || "All";

  return selectedPlatform === "All"
    ? posts
    : posts.filter(p => p.platform === selectedPlatform);
}
let activePlatform = "All";
const STORAGE_KEY = 'creatorHealthPosts';
const FOLLOWERS_KEY = 'creatorHealthFollowers';

const activityForm = document.getElementById('activityForm');
const activityList = document.getElementById('activityList');
const totalPostsEl = document.getElementById('totalPosts');
const totalLikesEl = document.getElementById('totalLikes');
const totalCommentsEl = document.getElementById('totalComments');
const avgCommentsPerPostEl = document.getElementById('avgCommentsPerPost');
const healthScoreEl = document.getElementById('healthScore');
const healthLabelHeroEl = document.getElementById('healthLabelHero');
const scoreRingEl = document.getElementById('scoreRing');
const reminderAlertEl = document.getElementById('reminderAlert');
const insightsListEl = document.getElementById('insightsList');
const typeAnalyticsEl = document.getElementById('typeAnalytics');
const bestPerformingTypeEl = document.getElementById('bestPerformingType');
const followersInput = document.getElementById('followersInput');
const saveFollowersBtn = document.getElementById('saveFollowersBtn');
const passwordInput = document.getElementById('passwordInput');
const passwordStrengthEl = document.getElementById('passwordStrength');
const postIdeasEl = document.getElementById('postIdeas');
const captionsEl = document.getElementById('captions');
const generateAiBtn = document.getElementById('generateAiBtn');
const aiPlatformEl = document.getElementById('aiPlatform');

let posts = loadPosts();

function loadPosts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function saveFollowers() {
  const value = Number(followersInput.value);
  if (!Number.isFinite(value) || value < 0) return;
  localStorage.setItem(FOLLOWERS_KEY, String(value));
}

function loadFollowers() {
  const saved = localStorage.getItem(FOLLOWERS_KEY);
  followersInput.value = saved ?? '';
}

function formatDate(value) {
  const d = new Date(value + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function renderActivity() {
  if (!posts.length) {
    activityList.innerHTML = '<p class="subtle">No activity yet. Add your first post.</p>';
    return;
  }

  const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  activityList.innerHTML = sorted
    .map(
      (post) => `
        <div class="activity-item">
          <strong>${post.platform} • ${post.type || 'Post'}</strong>
          <span>${formatDate(post.date)}</span>
          <span>${post.likes} likes • ${Number(post.comments || 0)} comments</span>
        </div>
      `
    )
    .join('');
}

function calculateHealth(data) {
  if (!data || data.length === 0) {
    return { score: 0, label: 'Poor' };
  }

  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  const likesTotal = data.reduce((sum, post) => sum + Number(post.likes), 0);
  const commentsTotal = data.reduce((sum, post) => sum + Number(post.comments || 0), 0);

  const avgLikes = likesTotal / data.length;
  const avgComments = commentsTotal / data.length;

  const start = new Date(sorted[0].date + 'T00:00:00');
  const end = new Date(sorted[sorted.length - 1].date + 'T00:00:00');

  const daySpan = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const postingFrequency = data.length / daySpan;

  const frequencyScore = Math.min(50, postingFrequency * 120);
  const weightedEngagement = avgLikes + avgComments * 3;
  const engagementScore = Math.min(50, weightedEngagement / 50);

  const score = Math.min(100, Math.round(frequencyScore + engagementScore));

  let label = 'Poor';
  if (score >= 75) label = 'Excellent';
  else if (score >= 45) label = 'Good';

  return { score, label };
}

function updateReminder() {
  if (!posts.length) {
    reminderAlertEl.classList.remove('hidden');
    return;
  }

  const latest = posts.reduce((latestDate, post) => {
    const date = new Date(post.date + 'T00:00:00');
    return date > latestDate ? date : latestDate;
  }, new Date(0));

  const now = new Date();
  const daysSince = (now - latest) / (1000 * 60 * 60 * 24);

  reminderAlertEl.classList.toggle('hidden', daysSince <= 3);
}

function renderInsights(data) {
  const insights = [];

  const totalLikes = data.reduce((sum, post) => sum + Number(post.likes || 0), 0);
  const totalComments = data.reduce((sum, post) => sum + Number(post.comments || 0), 0);

  const avgLikes = data.length ? totalLikes / data.length : 0;
  const avgComments = data.length ? totalComments / data.length : 0;

  if (!data.length) {
    insights.push('Start by posting at least 3 times this week to build momentum.');
    insights.push('Track likes per platform to identify what content performs best.');
  } else {
    const health = calculateHealth(data);

    if (health.score < 45) insights.push('Post more frequently to increase your consistency score.');
    if (avgLikes < 100) insights.push('Try short videos and strong hooks in the first 3 seconds.');
    if (avgLikes >= 100) insights.push('Great engagement—double down on your top-performing topics.');
    if (avgComments >= 8) insights.push('Posts with more comments perform better.');
    if (avgComments < 8) insights.push('Encourage interaction to increase engagement.');

    const platformCounts = data.reduce((acc, post) => {
      acc[post.platform] = (acc[post.platform] || 0) + 1;
      return acc;
    }, {});

    const dominantPlatform = Object.entries(platformCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    if (dominantPlatform) {
      insights.push(`Your strongest activity is on ${dominantPlatform}. Repurpose winning posts to other platforms.`);
    }
  }

  insightsListEl.innerHTML = insights.map(item => `<li>${item}</li>`).join('');
}

function renderTypeAnalytics(data) {
  if (!data.length) {
    bestPerformingTypeEl.textContent = 'Best performing type: N/A';
    typeAnalyticsEl.innerHTML = '<p class="subtle">Add posts to see performance by Reel, Post, and Story.</p>';
    return;
  }

  const grouped = data.reduce((acc, post) => {
    const type = post.type || 'Post';
    if (!acc[type]) {
      acc[type] = { count: 0, likes: 0, comments: 0 };
    }
    acc[type].count += 1;
    acc[type].likes += Number(post.likes) || 0;
    acc[type].comments += Number(post.comments || 0);
    return acc;
  }, {});

  const rows = Object.entries(grouped).map(([type, stats]) => {
    const avgLikes = stats.likes / stats.count;
    const avgComments = stats.comments / stats.count;
    const weightedScore = avgLikes + avgComments * 3;
    return { type, avgLikes, avgComments, weightedScore };
  });

  rows.sort((a, b) => b.weightedScore - a.weightedScore);
  const bestType = rows[0];
  bestPerformingTypeEl.textContent = `Best performing type: ${bestType.type}`;

  typeAnalyticsEl.innerHTML = rows
    .map(
      (row) => `
        <div class="activity-item">
          <strong>${row.type}</strong>
          <span>Avg Likes: ${row.avgLikes.toFixed(1)}</span>
          <span>Avg Comments: ${row.avgComments.toFixed(1)}</span>
        </div>
      `
    )
    .join('');
}
function generateRecommendation() {
  if (!posts || posts.length === 0) {
    return "Start adding posts to get insights.";
  }

  const grouped = posts.reduce((acc, post) => {
    const type = post.type || "Post";

    if (!acc[type]) {
      acc[type] = { likes: 0, count: 0 };
    }

    acc[type].likes += Number(post.likes) || 0;
    acc[type].count += 1;

    return acc;
  }, {});

  const sorted = Object.entries(grouped)
    .map(([type, stats]) => ({
      type,
      avg: stats.likes / stats.count
    }))
    .sort((a, b) => b.avg - a.avg);

  const best = sorted[0];

  return `Your best content is ${best.type}. Focus more on this.`;
}

function renderTrendChart(data) {

  const ctx = document.getElementById("trendChart");

  if (!ctx) return;

  if (window.trendChartInstance) {

    window.trendChartInstance.destroy();

  }

  const sorted = [...data].sort((a, b) => {

    return new Date(a.date || Date.now()) - new Date(b.date || Date.now());

  });

  const labels = sorted.map((_, i) => `Post ${i + 1}`);

  const likes = sorted.map(p => Number(p.likes) || 0);

  window.trendChartInstance = new Chart(ctx, {

    type: "line",
  
    data: {
  
      labels,
  
      datasets: [{
  
        label: "Likes Over Time",
  
        data: likes,
  
        borderWidth: 2,
  
        fill: false
  
      }]
  
    },
  
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  
  });

}

function updateDashboard() {
  const filtered = getFilteredPosts(); // ✅ THIS WAS MISSING

  const totalPosts = filtered.length;
  const totalLikes = filtered.reduce((sum, post) => sum + Number(post.likes), 0);
  const totalComments = filtered.reduce((sum, post) => sum + Number(post.comments || 0), 0);

  const { score, label } = calculateHealth(filtered);

  const avgCommentsPerPost = totalPosts ? totalComments / totalPosts : 0;

  totalPostsEl.textContent = String(totalPosts);
  totalLikesEl.textContent = String(totalLikes);
  totalCommentsEl.textContent = String(totalComments);
  avgCommentsPerPostEl.textContent = avgCommentsPerPost.toFixed(1);
  healthScoreEl.textContent = String(score);
  healthLabelHeroEl.textContent = label;

  healthLabelHeroEl.className = 'pill';

  let ringColor = '#ef4444';
  if (label === 'Excellent') {
    healthLabelHeroEl.classList.add('pill-excellent');
    ringColor = '#2dd4bf';
  } else if (label === 'Good') {
    healthLabelHeroEl.classList.add('pill-good');
    ringColor = '#f59e0b';
  } else {
    healthLabelHeroEl.classList.add('pill-poor');
  }

  scoreRingEl.style.setProperty('--score', String(score));
  scoreRingEl.style.setProperty('--ring-color', ringColor);

  updateReminder();
  renderInsights(filtered);
  renderTypeAnalytics(filtered);

  const recText = generateRecommendation();
  const recEl = document.getElementById("contentRecommendation");
  
  if (recEl) {
    recEl.textContent = recText;
  }
  renderTrendChart(filtered);
}

function handleActivitySubmit(event) {
  event.preventDefault();

  const platform = document.getElementById('platform').value;
  const type = document.getElementById('postType').value;
  const date = document.getElementById('date').value;
  const likes = Number(document.getElementById('likes').value);
  const comments = Number(document.getElementById('comments').value);

  if (!platform || !type || !date || !Number.isFinite(likes) || likes < 0 || !Number.isFinite(comments) || comments < 0) return;

  posts.push({ platform, type, date, likes, comments });
  savePosts();
  renderActivity();
  updateDashboard();
  activityForm.reset();
}

function getPasswordStrength(value) {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;

  if (score <= 1) return { label: 'Weak', className: 'pill-poor' };
  if (score === 2) return { label: 'Medium', className: 'pill-good' };
  return { label: 'Strong', className: 'pill-excellent' };
}

function generateAiContent(platform) {
  const templates = {
    Instagram: {
      ideas: [
        'Behind-the-scenes look at your creative workflow',
        'Carousel: 5 lessons from your last campaign',
        'Before-and-after transformation story',
        'Mini tutorial with actionable tips',
        'Q&A sticker follow-up post'
      ],
      captions: [
        'Consistency beats intensity—small actions daily win long-term.',
        'What part of this process should I break down next?',
        'Saved this for you—share it with a creator friend.'
      ]
    },
    TikTok: {
      ideas: [
        'Fast-paced “day in the life” creator vlog',
        'Trend remix in your niche with your own twist',
        'Myth vs fact in 30 seconds',
        '3 mistakes I made and how I fixed them',
        'Reaction to audience comments'
      ],
      captions: [
        'POV: You finally build a posting system that works.',
        'This one tip changed my content strategy completely.',
        'Follow for practical creator growth hacks.'
      ]
    },
    Facebook: {
      ideas: [
        'Value-packed text post with a personal story',
        'Community poll about upcoming content',
        'Short educational video with key takeaways',
        'Weekly recap of wins and lessons',
        'Audience spotlight or testimonial'
      ],
      captions: [
        'Building in public: here is what I learned this week.',
        'Would you like more posts like this? Let me know below.',
        'Sharing practical insights to help you grow steadily.'
      ]
    }
  };

  return templates[platform] || templates.Instagram;
}

function renderAiContent() {
  const platform = aiPlatformEl.value;
  const generated = generateAiContent(platform);
  postIdeasEl.innerHTML = generated.ideas.slice(0, 5).map((idea) => `<li>${idea}</li>`).join('');
  captionsEl.innerHTML = generated.captions.slice(0, 3).map((caption) => `<li>${caption}</li>`).join('');
}

function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const views = document.querySelectorAll('.view');
  const title = document.getElementById('view-title');

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const targetId = link.dataset.target;

      navLinks.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      views.forEach((view) => {
        view.classList.toggle('active', view.id === targetId);
      });

      title.textContent = link.textContent;
    });
  });
}

activityForm.addEventListener('submit', handleActivitySubmit);
saveFollowersBtn.addEventListener('click', saveFollowers);
passwordInput.addEventListener('input', (event) => {
  const { label, className } = getPasswordStrength(event.target.value);
  passwordStrengthEl.textContent = label;
  passwordStrengthEl.className = `pill ${className}`;
});
generateAiBtn.addEventListener('click', renderAiContent);

loadFollowers();
setupNavigation();
renderActivity();
updateDashboard();
renderAiContent();

function renderChart(data) {

  
  if (window.chartInstance) {
    window.chartInstance.destroy();
  }

  const ctx = document.getElementById("engagementChart");
  if (!ctx) return;

  
  const selectedPlatform = document.getElementById("platformFilter")?.value || "All";

  const filtered = selectedPlatform === "All"
    ? data
    : data.filter(p => p.platform === selectedPlatform);
  
  if (!filtered.length) {
    console.log("No data for selected platform");
    return;
  }

  //  Group by type
  const grouped = filtered.reduce((acc, post) => {
    const type = post.type || "Post";
    if (!acc[type]) {
      acc[type] = { likes: 0, count: 0 };
    }
    acc[type].likes += Number(post.likes) || 0;
    acc[type].count += 1;
    return acc;
  }, {});

  const labels = Object.keys(grouped);
  const avgLikes = labels.map(type => grouped[type].likes / grouped[type].count);

  window.chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Avg Likes by Type",
        data: avgLikes,
        backgroundColor: [

          "rgba(59,130,246,0.8)",
      
          "rgba(34,197,94,0.8)",
      
          "rgba(168,85,247,0.8)"
      
        ],
      
        borderRadius: 12,
      
        borderSkipped: false
      }],
    },
    options: {
      plugins: {
        legend: {
          labels: { color: "#fff" }
        }
      },
      scales: {
        x: { ticks: { color: "#aaa" } },
        y: { ticks: { color: "#aaa" } }
      }
    }
  });
}
setTimeout(() => {
  const data = JSON.parse(localStorage.getItem("creatorHealthPosts")) || [];
  renderChart(data);
}, 500);
document.getElementById("platformFilter")?.addEventListener("change", () => {
  updateDashboard();
renderChart(posts);
});