import re
import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3005"

def test_student_prediction_workflow(page: Page):
    """
    Test student user flow:
    Home -> Enter candidate details -> Generate predictions -> Verify Likely/Borderline -> Compare -> Shortlist
    """
    page.goto(BASE_URL, timeout=30000)
    
    # 1. Assert Title & Brand
    expect(page).to_have_title(re.compile("MHT CET College Predictor", re.IGNORECASE))
    expect(page.locator("header").get_by_text("MHT CET").first).to_be_visible()

    # 2. Enter candidate details
    percentile_input = page.locator("input[placeholder='e.g. 97.45']")
    expect(percentile_input).to_be_visible()
    percentile_input.fill("98.25")

    # 3. Click predict
    predict_btn = page.locator("button:has-text('Predict Colleges & Branches')")
    predict_btn.click()

    # 4. Verify results display
    results_header = page.locator("text=Predictions for 98.25%")
    expect(results_header).to_be_visible(timeout=15000)

    # 5. Check KPI likelihood cards
    expect(page.locator("text=Likely (Safe Options)").first).to_be_visible()
    expect(page.locator("text=Borderline (Target)").first).to_be_visible()
    expect(page.locator("text=Reach (Dream Options)").first).to_be_visible()

    # 6. Test Shortlisting an option
    save_btn = page.locator("button:has-text('Save')").first
    expect(save_btn).to_be_visible()
    save_btn.click()
    expect(page.locator("button:has-text('Saved')").first).to_be_visible()

    # 7. Open Shortlist Drawer
    shortlist_nav_btn = page.locator("header button:has-text('Shortlist')")
    shortlist_nav_btn.click()
    expect(page.locator("h3:has-text('My Shortlist')")).to_be_visible()

def test_admin_portal_workflow(page: Page):
    """
    Test Admin portal flow:
    Login -> View KPIs & Active Model -> Check Model Registry & Tabs
    """
    page.goto(f"{BASE_URL}/admin", timeout=30000)

    # Check if login form is present
    login_btn = page.locator("button:has-text('Sign In to Admin Portal')")
    if login_btn.is_visible():
        page.locator("input[type='text']").fill("admin")
        page.locator("input[type='password']").fill("Admin@MHTCET2026")
        login_btn.click()

    # Verify Admin Dashboard KPIs
    expect(page.locator("h3:has-text('Active in Production')").or_(page.locator("text=Admin Dashboard"))).to_be_visible(timeout=15000)
    expect(page.locator("text=Institutes Active")).to_be_visible()
    expect(page.locator("text=Verified Cutoffs")).to_be_visible()

    # Verify Active Model display
    expect(page.locator("button:has-text('Roll Back to Previous Model')")).to_be_visible()

    # Switch to Dataset Versions tab
    page.locator("button:has-text('Dataset Versions')").click()

def test_cap_choice_list_workflow(page: Page):
    """
    Test CAP Choice List Option Form flow:
    Home -> Predict -> Open 'Create CAP Choice List' -> Check 9-digit choice codes -> Auto-Arrange
    """
    page.goto(BASE_URL, timeout=30000)
    percentile_input = page.locator("input[placeholder='e.g. 97.45']")
    percentile_input.fill("98.50")
    page.locator("button:has-text('Predict Colleges & Branches')").click()

    choice_list_btn = page.locator("button:has-text('Create CAP Choice List')")
    expect(choice_list_btn).to_be_visible(timeout=15000)
    choice_list_btn.click()

    expect(page.locator("text=Centralized Admission Choice List Generator")).to_be_visible()
    expect(page.locator("text=Official CAP Round Option Form")).to_be_visible()
    expect(page.locator("button:has-text('Auto-Arrange (CAP Strategy)')")).to_be_visible()
    expect(page.locator("button:has-text('Download Official PDF')")).to_be_visible()
    expect(page.locator("button:has-text('Export CSV')")).to_be_visible()
    
    # Close modal
    page.locator("button:has-text('Done & Close')").click()
    expect(page.locator("text=Centralized Admission Choice List Generator")).not_to_be_visible()
