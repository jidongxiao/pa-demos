<?php
$blogDir = __DIR__; // current directory

// Helper function to extract <title> and meta description from HTML
function parseBlogMeta($filePath) {
    $content = file_get_contents($filePath);
    $title = '';
    $description = '';

    // Extract <title>
    if (preg_match('/<title>(.*?)<\/title>/is', $content, $matches)) {
        $title = trim($matches[1]);
    }

    // Extract meta description
    if (preg_match('/<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']/is', $content, $matches)) {
        $description = trim($matches[1]);
    }

    return [$title, $description];
}

// Get all .html or .php blog files, excluding index.php
$blogFiles = array_filter(scandir($blogDir), function($file) {
    return ($file !== '.' && $file !== '..' && $file !== 'index.php' && preg_match('/\.(html|php)$/i', $file));
});

// Sort by modification time (newest first)
usort($blogFiles, function($a, $b) use ($blogDir) {
    return filemtime("$blogDir/$b") - filemtime("$blogDir/$a");
});
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>All Blogs | Presentation Assistants</title>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-EY04EPSP2B"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-EY04EPSP2B');
</script>
  <link rel="icon" type="image/x-icon" href="/favicons/PresentationAssistantsWhite.ico">

  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Font Awesome -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" rel="stylesheet">
  <!-- Shared Styles -->
  <link href="../css/shared-styles.css" rel="stylesheet">

  <style>
    .content-section {
      padding: 60px 20px;
      max-width: 900px;
      margin: 0 auto;
    }
    .blog-card {
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .blog-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 18px rgba(0,0,0,0.15);
    }
    .blog-date {
      font-size: 0.85rem;
      color: #777;
    }
    .blog-description {
      margin-top: 0.5rem;
      color: #555;
    }
  </style>
</head>
<body>
  <section class="hero-section bg-light py-5">
    <div class="container text-center">
      <h1><i class="fas fa-newspaper me-3"></i>All Blogs</h1>
      <p class="lead">Explore our latest insights, tutorials, and feature updates on interactive presentations.</p>
    </div>
  </section>

  <main class="content-section">
    <?php if(empty($blogFiles)): ?>
      <p>No blog posts found.</p>
    <?php else: ?>
      <div class="row g-4">
        <?php foreach($blogFiles as $file): 
          $filePath = "$blogDir/$file";
          list($title, $description) = parseBlogMeta($filePath);
          if (!$title) {
              $title = ucwords(str_replace(['-', '_'], ' ', pathinfo($file, PATHINFO_FILENAME)));
          }
          $date = date("F j, Y", filemtime($filePath));
        ?>
          <div class="col-12 col-md-6">
            <div class="card blog-card h-100">
              <div class="card-body">
                <h5 class="card-title"><?php echo htmlspecialchars($title); ?></h5>
                <p class="blog-date"><i class="far fa-calendar-alt me-2"></i><?php echo $date; ?></p>
                <?php if($description): ?>
                  <p class="blog-description"><?php echo htmlspecialchars($description); ?></p>
                <?php endif; ?>
                <a href="<?php echo htmlspecialchars($file); ?>" class="btn btn-primary mt-2">Read More</a>
              </div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
