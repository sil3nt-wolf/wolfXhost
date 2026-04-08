-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jul 23, 2025 at 11:15 AM
-- Server version: 10.6.22-MariaDB-cll-lve-log
-- PHP Version: 8.3.23

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `talkdrove_HTD`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_log`
--

CREATE TABLE `activity_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(255) NOT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bots`
--

CREATE TABLE `bots` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `repo_url` varchar(255) NOT NULL,
  `deployment_cost` int(11) DEFAULT 0,
  `dev_number` varchar(20) DEFAULT NULL,
  `total_deployments` int(11) DEFAULT 0,
  `website_url` varchar(255) DEFAULT NULL,
  `developer_id` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `popularity_tier` enum('popular','rising','standard') DEFAULT 'standard',
  `created_at` datetime DEFAULT current_timestamp(),
  `is_suspended` tinyint(1) DEFAULT 0,
  `dev_email` varchar(255) DEFAULT NULL,
  `user_email` varchar(255) DEFAULT NULL,
  `request_id` int(11) DEFAULT NULL,
  `status` enum('approved','rejected','pending') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bot_change_requests`
--

CREATE TABLE `bot_change_requests` (
  `id` int(11) NOT NULL,
  `bot_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `repo_url` varchar(255) NOT NULL,
  `website_url` varchar(255) DEFAULT NULL,
  `dev_number` varchar(20) NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bot_change_request_env_vars`
--

CREATE TABLE `bot_change_request_env_vars` (
  `id` int(11) NOT NULL,
  `change_request_id` int(11) NOT NULL,
  `var_name` varchar(255) NOT NULL,
  `var_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bot_comments`
--

CREATE TABLE `bot_comments` (
  `id` int(11) NOT NULL,
  `bot_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bot_env_vars`
--

CREATE TABLE `bot_env_vars` (
  `id` int(11) NOT NULL,
  `bot_id` int(11) NOT NULL,
  `var_name` varchar(255) NOT NULL,
  `var_description` varchar(255) DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT 0,
  `required` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bot_reports`
--

CREATE TABLE `bot_reports` (
  `id` int(11) NOT NULL,
  `bot_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `report_type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `status` enum('pending','investigating','resolved') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bot_requests`
--

CREATE TABLE `bot_requests` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `repo_url` varchar(255) NOT NULL,
  `dev_number` varchar(20) NOT NULL,
  `deployment_cost` decimal(10,2) DEFAULT NULL,
  `website_url` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `user_email` varchar(255) DEFAULT NULL,
  `dev_email` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bot_request_env_vars`
--

CREATE TABLE `bot_request_env_vars` (
  `id` int(11) NOT NULL,
  `request_id` int(11) DEFAULT NULL,
  `var_name` varchar(255) NOT NULL,
  `var_description` text DEFAULT NULL,
  `required` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bot_social_links`
--

CREATE TABLE `bot_social_links` (
  `id` int(11) NOT NULL,
  `request_id` int(11) DEFAULT NULL,
  `link_type` varchar(50) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `coin_transactions`
--

CREATE TABLE `coin_transactions` (
  `id` int(11) NOT NULL,
  `sender_phone` varchar(20) DEFAULT NULL,
  `recipient_phone` varchar(20) DEFAULT NULL,
  `amount` int(11) NOT NULL,
  `transaction_type` enum('deployment','referral_reward','deposit','dev_share') NOT NULL,
  `transaction_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `receiver_phone` varchar(20) DEFAULT NULL,
  `app_id` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `approval_date` timestamp NULL DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `payment_screenshot` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `approved_by` int(11) DEFAULT NULL,
  `payment_method_id` int(11) DEFAULT NULL,
  `country_code` varchar(10) DEFAULT NULL,
  `moderator_id` int(11) DEFAULT NULL,
  `sender_username` varchar(255) DEFAULT NULL,
  `recipient_username` varchar(255) DEFAULT NULL,
  `sender_email` varchar(255) DEFAULT NULL,
  `recipient_email` varchar(255) DEFAULT NULL,
  `receiver_email` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ContactMessages`
--

CREATE TABLE `ContactMessages` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `status` enum('new','read','replied') DEFAULT 'new'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deployed_apps`
--

CREATE TABLE `deployed_apps` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `bot_id` int(11) NOT NULL,
  `app_name` varchar(255) NOT NULL,
  `heroku_app_name` varchar(255) DEFAULT NULL,
  `status` enum('deploying','configuring','building','active','failed') DEFAULT 'deploying',
  `error_message` text DEFAULT NULL,
  `deployed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_coin_deduction` timestamp NULL DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `heroku_api_key` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deployment_env_vars`
--

CREATE TABLE `deployment_env_vars` (
  `id` int(11) NOT NULL,
  `deployment_id` int(11) NOT NULL,
  `var_name` varchar(255) DEFAULT NULL,
  `var_value` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deployment_history`
--

CREATE TABLE `deployment_history` (
  `id` int(11) NOT NULL,
  `deployment_id` int(11) DEFAULT NULL,
  `app_name` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `last_checked` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_redeployed` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `redeployment_count` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_senders`
--

CREATE TABLE `email_senders` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `host` varchar(255) NOT NULL DEFAULT 'mail.talkdrove.cc.nf',
  `port` int(11) NOT NULL DEFAULT 587,
  `is_active` tinyint(1) DEFAULT 1,
  `daily_limit` int(11) DEFAULT 150,
  `current_daily_count` int(11) DEFAULT 0,
  `last_reset_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `total_emails_sent` int(11) DEFAULT 0,
  `last_used_timestamp` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `favorite_bots`
--

CREATE TABLE `favorite_bots` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `bot_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `heroku_accounts`
--

CREATE TABLE `heroku_accounts` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `api_key` varchar(255) NOT NULL,
  `recovery_codes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `is_sold` tinyint(1) DEFAULT 0,
  `is_valid` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `heroku_api_keys`
--

CREATE TABLE `heroku_api_keys` (
  `id` int(11) NOT NULL,
  `api_key` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_checked` timestamp NOT NULL DEFAULT current_timestamp(),
  `failed_attempts` int(11) DEFAULT 0,
  `last_used` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_failed` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `successful_deployments` int(11) DEFAULT 0,
  `last_error` text DEFAULT NULL,
  `current_app_count` int(11) DEFAULT 0,
  `apps_count` int(11) DEFAULT 0,
  `error_message` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invites`
--

CREATE TABLE `invites` (
  `id` int(11) NOT NULL,
  `inviter_id` int(11) NOT NULL,
  `invite_code` varchar(255) NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `used_by` varchar(255) DEFAULT NULL,
  `used_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ip_account_tracking`
--

CREATE TABLE `ip_account_tracking` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `account_count` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_signup` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_progress`
--

CREATE TABLE `maintenance_progress` (
  `id` int(11) NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `end_time` timestamp NULL DEFAULT NULL,
  `apps_processed` int(11) DEFAULT 0,
  `apps_deleted` int(11) DEFAULT 0,
  `coins_deducted` decimal(10,2) DEFAULT 0.00,
  `status` enum('running','completed','failed') DEFAULT 'running',
  `last_processed_app_id` int(11) DEFAULT NULL,
  `error_message` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_statistics`
--

CREATE TABLE `maintenance_statistics` (
  `date` date NOT NULL,
  `total_apps_processed` int(11) DEFAULT 0,
  `total_apps_deleted` int(11) DEFAULT 0,
  `total_coins_deducted` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `moderators`
--

CREATE TABLE `moderators` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `moderator_countries`
--

CREATE TABLE `moderator_countries` (
  `id` int(11) NOT NULL,
  `moderator_id` int(11) NOT NULL,
  `country_code` varchar(2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `type` varchar(50) DEFAULT 'general',
  `read` tinyint(1) DEFAULT 0,
  `seen` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `link` varchar(255) DEFAULT NULL,
  `target_type` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_recipients`
--

CREATE TABLE `notification_recipients` (
  `id` int(11) NOT NULL,
  `notification_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_targets`
--

CREATE TABLE `notification_targets` (
  `id` int(11) NOT NULL,
  `notification_id` int(11) DEFAULT NULL,
  `target_type` enum('all','specific') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_methods`
--

CREATE TABLE `payment_methods` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `country_code` varchar(3) NOT NULL DEFAULT 'ALL'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_method_details`
--

CREATE TABLE `payment_method_details` (
  `id` int(11) NOT NULL,
  `payment_method_id` int(11) DEFAULT NULL,
  `account_name` varchar(100) DEFAULT NULL,
  `account_number` varchar(100) DEFAULT NULL,
  `additional_info` text DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `instructions` text DEFAULT NULL,
  `country_code` varchar(50) DEFAULT 'ALL'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_requests`
--

CREATE TABLE `payment_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `checkout_id` varchar(255) NOT NULL,
  `order_id` varchar(255) DEFAULT NULL,
  `customer_id` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','completed','failed','completed_redirect') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `product_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `coins` int(11) NOT NULL,
  `description` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchased_heroku_accounts`
--

CREATE TABLE `purchased_heroku_accounts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `purchased_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchases`
--

CREATE TABLE `purchases` (
  `id` int(11) NOT NULL,
  `product_id` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `purchase_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `checkout_id` varchar(255) NOT NULL,
  `coins_purchased` int(11) NOT NULL,
  `order_id` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `referrals`
--

CREATE TABLE `referrals` (
  `id` int(11) NOT NULL,
  `referrer_id` int(11) NOT NULL,
  `referred_id` int(11) NOT NULL,
  `coins_awarded` int(11) DEFAULT 20,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `invite_code_used` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_tickets`
--

CREATE TABLE `support_tickets` (
  `ticket_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `status` enum('open','in_progress','resolved','closed') DEFAULT 'open',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `category` varchar(100) DEFAULT 'general',
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(255) NOT NULL,
  `assigned_to` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ticket_chat_messages`
--

CREATE TABLE `ticket_chat_messages` (
  `message_id` varchar(36) NOT NULL,
  `ticket_id` varchar(36) DEFAULT NULL,
  `sender_id` varchar(36) DEFAULT NULL,
  `sender_name` varchar(100) DEFAULT NULL,
  `message_text` text DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ticket_replies`
--

CREATE TABLE `ticket_replies` (
  `reply_id` varchar(36) NOT NULL,
  `ticket_id` varchar(36) DEFAULT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `reply_text` text DEFAULT NULL,
  `is_internal` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `coins` int(11) DEFAULT 0,
  `is_admin` tinyint(1) DEFAULT 0,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `referrer_id` int(11) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'UTC',
  `country_code` varchar(2) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `permanent_invite_code` varchar(255) DEFAULT NULL,
  `total_referrals` int(11) DEFAULT 0,
  `invite_code_used` varchar(255) DEFAULT NULL,
  `referral_code` varchar(8) DEFAULT NULL,
  `referred_by` int(11) DEFAULT NULL,
  `is_banned` tinyint(1) DEFAULT 0,
  `last_login` datetime DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `last_deposit_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `username` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `whatsapp_link` varchar(255) DEFAULT NULL,
  `youtube_link` varchar(255) DEFAULT NULL,
  `website_link` varchar(255) DEFAULT NULL,
  `github_link` varchar(255) DEFAULT NULL,
  `linkedin_link` varchar(255) DEFAULT NULL,
  `x_link` varchar(255) DEFAULT NULL,
  `instagram_link` varchar(255) DEFAULT NULL,
  `twitter_link` varchar(255) DEFAULT NULL,
  `version` int(11) DEFAULT 0,
  `last_claim_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_appeals`
--

CREATE TABLE `user_appeals` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reason` text NOT NULL,
  `additional_info` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `admin_response` text DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_country`
--

CREATE TABLE `user_country` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `country` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_devices`
--

CREATE TABLE `user_devices` (
  `id` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `device_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`device_info`)),
  `location` varchar(255) DEFAULT NULL,
  `last_used` datetime NOT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `youtube_subscriptions`
--

CREATE TABLE `youtube_subscriptions` (
  `id` int(11) NOT NULL,
  `user_email` varchar(255) NOT NULL,
  `channel_id` varchar(255) NOT NULL,
  `verified_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bots`
--
ALTER TABLE `bots`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bot_change_requests`
--
ALTER TABLE `bot_change_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bot_change_request_env_vars`
--
ALTER TABLE `bot_change_request_env_vars`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bot_comments`
--
ALTER TABLE `bot_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `bot_env_vars`
--
ALTER TABLE `bot_env_vars`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bot_reports`
--
ALTER TABLE `bot_reports`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bot_requests`
--
ALTER TABLE `bot_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bot_request_env_vars`
--
ALTER TABLE `bot_request_env_vars`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bot_social_links`
--
ALTER TABLE `bot_social_links`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `coin_transactions`
--
ALTER TABLE `coin_transactions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ContactMessages`
--
ALTER TABLE `ContactMessages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `deployed_apps`
--
ALTER TABLE `deployed_apps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_deployed_apps_user_id` (`user_id`),
  ADD KEY `idx_deployed_apps_last_coin_deduction` (`last_coin_deduction`),
  ADD KEY `idx_deployed_apps_deployed_at` (`deployed_at`);

--
-- Indexes for table `deployment_env_vars`
--
ALTER TABLE `deployment_env_vars`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `deployment_history`
--
ALTER TABLE `deployment_history`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `email_senders`
--
ALTER TABLE `email_senders`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `favorite_bots`
--
ALTER TABLE `favorite_bots`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `heroku_accounts`
--
ALTER TABLE `heroku_accounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `heroku_api_keys`
--
ALTER TABLE `heroku_api_keys`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `invites`
--
ALTER TABLE `invites`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ip_account_tracking`
--
ALTER TABLE `ip_account_tracking`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `maintenance_progress`
--
ALTER TABLE `maintenance_progress`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payment_requests`
--
ALTER TABLE `payment_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `checkout_id` (`checkout_id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_id` (`product_id`);

--
-- Indexes for table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `purchases_ibfk_1` (`product_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_users_last_claim_date` (`last_claim_date`);

--
-- Indexes for table `user_devices`
--
ALTER TABLE `user_devices`
  ADD KEY `idx_user_devices` (`user_id`,`device_info`(255));

--
-- Indexes for table `youtube_subscriptions`
--
ALTER TABLE `youtube_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_email` (`user_email`,`channel_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_log`
--
ALTER TABLE `activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bots`
--
ALTER TABLE `bots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bot_change_requests`
--
ALTER TABLE `bot_change_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bot_change_request_env_vars`
--
ALTER TABLE `bot_change_request_env_vars`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bot_comments`
--
ALTER TABLE `bot_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bot_env_vars`
--
ALTER TABLE `bot_env_vars`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bot_reports`
--
ALTER TABLE `bot_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bot_requests`
--
ALTER TABLE `bot_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bot_request_env_vars`
--
ALTER TABLE `bot_request_env_vars`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bot_social_links`
--
ALTER TABLE `bot_social_links`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `coin_transactions`
--
ALTER TABLE `coin_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ContactMessages`
--
ALTER TABLE `ContactMessages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deployed_apps`
--
ALTER TABLE `deployed_apps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deployment_env_vars`
--
ALTER TABLE `deployment_env_vars`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deployment_history`
--
ALTER TABLE `deployment_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `email_senders`
--
ALTER TABLE `email_senders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `favorite_bots`
--
ALTER TABLE `favorite_bots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `heroku_accounts`
--
ALTER TABLE `heroku_accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `heroku_api_keys`
--
ALTER TABLE `heroku_api_keys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invites`
--
ALTER TABLE `invites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ip_account_tracking`
--
ALTER TABLE `ip_account_tracking`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `maintenance_progress`
--
ALTER TABLE `maintenance_progress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_requests`
--
ALTER TABLE `payment_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `youtube_subscriptions`
--
ALTER TABLE `youtube_subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bot_comments`
--
ALTER TABLE `bot_comments`
  ADD CONSTRAINT `bot_comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_requests`
--
ALTER TABLE `payment_requests`
  ADD CONSTRAINT `payment_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `purchases`
--
ALTER TABLE `purchases`
  ADD CONSTRAINT `purchases_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE;

--
-- Constraints for table `youtube_subscriptions`
--
ALTER TABLE `youtube_subscriptions`
  ADD CONSTRAINT `youtube_subscriptions_ibfk_1` FOREIGN KEY (`user_email`) REFERENCES `users` (`email`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
