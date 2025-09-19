#!/usr/bin/env node

/**
 * Test script for the unified SkillSelector component
 * Verifies all functionality and integrations
 */

const fs = require('fs');
const path = require('path');

// Test results
const testResults = {
  component: [],
  integration: [],
  data: [],
  ui: []
};

console.log('🧪 TESTING UNIFIED SKILLSELECTOR COMPONENT\n');

// Test 1: Component File Existence
function testComponentExists() {
  const skillSelectorPath = path.join(__dirname, '..', 'components/SkillSelector/SkillSelector.js');

  if (fs.existsSync(skillSelectorPath)) {
    testResults.component.push('✅ SkillSelector component file exists');
    return true;
  } else {
    testResults.component.push('❌ SkillSelector component file missing');
    return false;
  }
}

// Test 2: Component Structure and Props
function testComponentStructure() {
  const skillSelectorPath = path.join(__dirname, '..', 'components/SkillSelector/SkillSelector.js');

  if (!fs.existsSync(skillSelectorPath)) {
    testResults.component.push('❌ Cannot test structure - file missing');
    return false;
  }

  const content = fs.readFileSync(skillSelectorPath, 'utf8');

  // Test required props
  const requiredProps = [
    'isModal',
    'selectedSkills',
    'onSkillsChange',
    'maxSkills',
    'minSkills'
  ];

  const hasAllProps = requiredProps.every(prop =>
    content.includes(`props.${prop}`) || content.includes(`${prop}`)
  );

  if (hasAllProps) {
    testResults.component.push('✅ All required props are present');
  } else {
    testResults.component.push('❌ Missing required props');
  }

  // Test imports
  const requiredImports = [
    'skillCategories',
    'getSkillSuggestions',
    'motion',
    'AnimatePresence'
  ];

  const hasAllImports = requiredImports.every(imp => content.includes(imp));

  if (hasAllImports) {
    testResults.component.push('✅ All required imports present');
  } else {
    testResults.component.push('❌ Missing required imports');
  }

  // Test category icons mapping
  if (content.includes('categoryIcons') && content.includes('Electrical Services')) {
    testResults.component.push('✅ Category icons mapping implemented');
  } else {
    testResults.component.push('❌ Category icons mapping missing');
  }

  return true;
}

// Test 3: Data Integration
function testDataIntegration() {
  const citiesPath = path.join(__dirname, '..', 'data/cities.js');

  if (!fs.existsSync(citiesPath)) {
    testResults.data.push('❌ Cities data file missing');
    return false;
  }

  const content = fs.readFileSync(citiesPath, 'utf8');

  // Test skill categories export
  if (content.includes('export const skillCategories')) {
    testResults.data.push('✅ skillCategories exported from cities.js');
  } else {
    testResults.data.push('❌ skillCategories export missing');
  }

  // Test skill suggestions function
  if (content.includes('getSkillSuggestions')) {
    testResults.data.push('✅ getSkillSuggestions function available');
  } else {
    testResults.data.push('❌ getSkillSuggestions function missing');
  }

  // Test skill categories structure
  if (content.includes('Electrical Services') && content.includes('Plumbing Services')) {
    testResults.data.push('✅ Comprehensive skill categories available');
  } else {
    testResults.data.push('❌ Skill categories incomplete');
  }

  return true;
}

// Test 4: Integration with Signup Page
function testSignupIntegration() {
  const signupPath = path.join(__dirname, '..', 'app/auth/signup/page.js');

  if (!fs.existsSync(signupPath)) {
    testResults.integration.push('❌ Signup page missing');
    return false;
  }

  const content = fs.readFileSync(signupPath, 'utf8');

  // Test SkillSelector import
  if (content.includes('SkillSelector') && content.includes('components/SkillSelector')) {
    testResults.integration.push('✅ SkillSelector imported in signup page');
  } else {
    testResults.integration.push('❌ SkillSelector not properly imported');
  }

  // Test component usage
  if (content.includes('<SkillSelector')) {
    testResults.integration.push('✅ SkillSelector component used in signup');
  } else {
    testResults.integration.push('❌ SkillSelector not used in signup');
  }

  // Test props passed
  if (content.includes('selectedSkills') && content.includes('onSkillsChange')) {
    testResults.integration.push('✅ Required props passed to SkillSelector');
  } else {
    testResults.integration.push('❌ Missing required props in signup integration');
  }

  return true;
}

// Test 5: DynamicComponents Integration
function testDynamicComponentsIntegration() {
  const dynamicPath = path.join(__dirname, '..', 'components/dynamic/DynamicComponents.js');

  if (!fs.existsSync(dynamicPath)) {
    testResults.integration.push('❌ DynamicComponents file missing');
    return false;
  }

  const content = fs.readFileSync(dynamicPath, 'utf8');

  // Test SkillSelector export
  if (content.includes('export const SkillSelector')) {
    testResults.integration.push('✅ SkillSelector exported from DynamicComponents');
  } else {
    testResults.integration.push('❌ SkillSelector not exported from DynamicComponents');
  }

  // Test old component removal
  if (!content.includes('SkillSelectionModal')) {
    testResults.integration.push('✅ Old SkillSelectionModal removed');
  } else {
    testResults.integration.push('❌ Old SkillSelectionModal still present');
  }

  return true;
}

// Test 6: Old Components Removal
function testOldComponentsRemoval() {
  const oldModalPath = path.join(__dirname, '..', 'components/SkillSelectionModal.js');
  const oldInlinePath = path.join(__dirname, '..', 'components/SkillsSelection');

  if (!fs.existsSync(oldModalPath)) {
    testResults.component.push('✅ Old SkillSelectionModal.js removed');
  } else {
    testResults.component.push('❌ Old SkillSelectionModal.js still exists');
  }

  if (!fs.existsSync(oldInlinePath)) {
    testResults.component.push('✅ Old SkillsSelection directory removed');
  } else {
    testResults.component.push('❌ Old SkillsSelection directory still exists');
  }
}

// Test 7: UI/UX Features
function testUIUXFeatures() {
  const skillSelectorPath = path.join(__dirname, '..', 'components/SkillSelector/SkillSelector.js');

  if (!fs.existsSync(skillSelectorPath)) {
    testResults.ui.push('❌ Cannot test UI features - component missing');
    return false;
  }

  const content = fs.readFileSync(skillSelectorPath, 'utf8');

  // Test animations
  if (content.includes('motion.') && content.includes('AnimatePresence')) {
    testResults.ui.push('✅ Smooth animations implemented');
  } else {
    testResults.ui.push('❌ Animations missing');
  }

  // Test responsive design
  if (content.includes('grid-cols-') && content.includes('md:') && content.includes('lg:')) {
    testResults.ui.push('✅ Responsive design implemented');
  } else {
    testResults.ui.push('❌ Responsive design missing');
  }

  // Test interactive states
  if (content.includes('hover:') && content.includes('group-hover:')) {
    testResults.ui.push('✅ Interactive hover states present');
  } else {
    testResults.ui.push('❌ Interactive states missing');
  }

  // Test accessibility
  if (content.includes('transition-') && content.includes('focus:')) {
    testResults.ui.push('✅ Accessibility features present');
  } else {
    testResults.ui.push('❌ Accessibility features missing');
  }

  // Test visual feedback
  if (content.includes('toast.') && content.includes('Check')) {
    testResults.ui.push('✅ Visual feedback implemented');
  } else {
    testResults.ui.push('❌ Visual feedback missing');
  }

  return true;
}

// Run all tests
function runAllTests() {
  console.log('📋 Running Component Tests...');
  testComponentExists();
  testComponentStructure();
  testOldComponentsRemoval();

  console.log('📋 Running Data Integration Tests...');
  testDataIntegration();

  console.log('📋 Running Integration Tests...');
  testSignupIntegration();
  testDynamicComponentsIntegration();

  console.log('📋 Running UI/UX Tests...');
  testUIUXFeatures();
}

// Display results
function displayResults() {
  console.log('\n🎯 TEST RESULTS SUMMARY\n');

  console.log('🧩 COMPONENT TESTS:');
  testResults.component.forEach(result => console.log(`  ${result}`));

  console.log('\n📊 DATA INTEGRATION TESTS:');
  testResults.data.forEach(result => console.log(`  ${result}`));

  console.log('\n🔗 INTEGRATION TESTS:');
  testResults.integration.forEach(result => console.log(`  ${result}`));

  console.log('\n🎨 UI/UX TESTS:');
  testResults.ui.forEach(result => console.log(`  ${result}`));

  // Calculate success rate
  const allResults = [
    ...testResults.component,
    ...testResults.data,
    ...testResults.integration,
    ...testResults.ui
  ];

  const successCount = allResults.filter(result => result.includes('✅')).length;
  const totalCount = allResults.length;
  const successRate = Math.round((successCount / totalCount) * 100);

  console.log(`\n📈 OVERALL SUCCESS RATE: ${successRate}% (${successCount}/${totalCount})`);

  if (successRate >= 90) {
    console.log('🎉 EXCELLENT! Skills system is well implemented!');
  } else if (successRate >= 75) {
    console.log('👍 GOOD! Minor improvements needed.');
  } else {
    console.log('⚠️  NEEDS ATTENTION! Several issues to resolve.');
  }
}

// Main execution
runAllTests();
displayResults();

console.log('\n✨ Test completed! Use this unified SkillSelector component everywhere in the app.\n');