<?php
session_start();

/* Clear only demo-related session data */
unset($_SESSION['demo_username']);
unset($_SESSION['demo_user_id']);

/* Redirect back to landing page */
header('Location: index.php');
exit;
?>
