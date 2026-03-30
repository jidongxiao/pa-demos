<?php
include('../config.php');

// database connection settings
$servername = DB_SERVER;
$db_username = DB_USERNAME;
$db_password = DB_PASSWORD;
$dbname = DB_DATABASE;

// create connection
$conn = new mysqli($servername, $db_username, $db_password, $dbname);

// check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "
  SELECT c.calendar_id, c.calendar_name, ag.group_name
  FROM calendars c
  JOIN audience_groups ag ON c.group_id = ag.id
  ORDER BY c.calendar_id ASC
";
$result = $conn->query($sql);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>All Public Calendars | Presentation Assistants</title>
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
  </style>
</head>
<body>
  <!-- Hero Section -->
  <section class="hero-section">
    <div class="container text-center">
      <h1><i class="fas fa-calendar-alt me-3"></i>All Public Calendars</h1>
      <p class="lead">Browse all available calendars created in <strong>Presentation Assistants</strong>. Select a calendar below to view its events and resources.</p>
    </div>
  </section>

  <!-- Main Content -->
  <main class="content-section">
    <h2 class="mb-4"><i class="fas fa-list me-2"></i>Available Calendars</h2>
    <div class="list-group">
      <?php while ($row = $result->fetch_assoc()): ?>
        <a href="/calendar/<?php echo htmlspecialchars($row['group_name']); ?>" 
           class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
          <span><i class="fas fa-calendar me-2"></i><?php echo htmlspecialchars($row['calendar_name']); ?></span>
          <i class="fas fa-arrow-right"></i>
        </a>
      <?php endwhile; ?>
    </div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
